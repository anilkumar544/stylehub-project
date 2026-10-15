import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from ..config import settings
from ..database import get_db
from ..models import CartItem, Order, OrderItem
from ..deps import CurrentUser
from ..schemas import CheckoutOut, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])

def payment_matches_order(intent, order: Order) -> bool:
    return (
        intent.status == "succeeded"
        and intent.amount == order.total_cents
        and intent.currency == "usd"
        and intent.metadata.get("order_id") == str(order.id)
        and intent.metadata.get("user_id") == str(order.user_id)
    )

def order_dict(order: Order):
    return {"id": order.id, "total_cents": order.total_cents, "status": order.status,
            "created_at": order.created_at.isoformat(),
            "items": [{"product_id": i.product_id, "product_name": i.product_name,
                       "unit_price_cents": i.unit_price_cents, "quantity": i.quantity} for i in order.items]}

@router.post("/checkout", response_model=CheckoutOut)
def checkout(user: CurrentUser, db: Session = Depends(get_db)):
    if not settings.stripe_secret_key or settings.stripe_secret_key.endswith("replace_me"):
        raise HTTPException(status_code=503, detail="Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env")
    stripe.api_key = settings.stripe_secret_key
    cart = db.query(CartItem).options(joinedload(CartItem.product)).filter_by(user_id=user.id).all()
    if not cart:
        raise HTTPException(status_code=400, detail="Your cart is empty")
    total = sum(item.quantity * item.product.price_cents for item in cart)
    order = Order(user_id=user.id, total_cents=total, status="pending")
    for item in cart:
        order.items.append(OrderItem(product_id=item.product.id, product_name=item.product.name,
                                     unit_price_cents=item.product.price_cents, quantity=item.quantity))
    db.add(order)
    db.commit()
    db.refresh(order)
    try:
        intent = stripe.PaymentIntent.create(
            amount=total, currency="usd",
            automatic_payment_methods={"enabled": True},
            metadata={"order_id": str(order.id), "user_id": str(user.id)},
        )
    except stripe.StripeError as exc:
        db.delete(order)
        db.commit()
        raise HTTPException(status_code=502, detail="Unable to start payment. Check Stripe configuration.") from exc
    order.stripe_payment_intent_id = intent.id
    db.commit()
    return {"order_id": order.id, "client_secret": intent.client_secret, "total_cents": total}

@router.post("/{order_id}/confirm", response_model=OrderOut)
def confirm_order(order_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    order = db.query(Order).options(joinedload(Order.items)).filter_by(id=order_id, user_id=user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "paid":
        return order_dict(order)
    if not order.stripe_payment_intent_id:
        raise HTTPException(status_code=400, detail="Payment has not been initialized")
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured")
    stripe.api_key = settings.stripe_secret_key
    try:
        intent = stripe.PaymentIntent.retrieve(order.stripe_payment_intent_id)
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail="Could not verify payment with Stripe") from exc
    if not payment_matches_order(intent, order):
        raise HTTPException(status_code=400, detail=f"Payment is not complete (status: {intent.status})")
    order.status = "paid"
    db.query(CartItem).filter_by(user_id=user.id).delete()
    db.commit()
    db.refresh(order)
    return order_dict(order)

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    if not settings.stripe_webhook_secret or settings.stripe_webhook_secret.endswith("replace_me"):
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured")
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature or payload") from exc

    if event.type not in {
        "payment_intent.succeeded",
        "payment_intent.payment_failed",
        "payment_intent.canceled",
    }:
        return {"received": True}

    intent = event.data.object
    order_id = intent.metadata.get("order_id")
    if not order_id or not str(order_id).isdecimal():
        return {"received": True}
    order = (
        db.query(Order)
        .filter_by(id=int(order_id), stripe_payment_intent_id=intent.id)
        .first()
    )
    if not order:
        return {"received": True}

    if event.type == "payment_intent.succeeded":
        if not payment_matches_order(intent, order):
            raise HTTPException(status_code=400, detail="Stripe payment does not match the order")
        order.status = "paid"
        db.query(CartItem).filter_by(user_id=order.user_id).delete()
    elif order.status == "pending":
        order.status = "failed" if event.type == "payment_intent.payment_failed" else "canceled"

    db.commit()
    return {"received": True}

@router.get("", response_model=list[OrderOut])
def order_history(user: CurrentUser, db: Session = Depends(get_db)):
    orders = db.query(Order).options(joinedload(Order.items)).filter_by(user_id=user.id).order_by(Order.id.desc()).all()
    return [order_dict(order) for order in orders]
