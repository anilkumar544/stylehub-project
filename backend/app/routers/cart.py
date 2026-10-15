from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import CartItem, Product
from ..schemas import CartAddIn, CartQuantityIn, CartOut
from ..deps import CurrentUser

router = APIRouter(prefix="/api/cart", tags=["cart"])

def make_cart(db: Session, user_id: int):
    rows = db.query(CartItem).options(joinedload(CartItem.product)).filter(CartItem.user_id == user_id).all()
    items = [{"id": r.id, "product_id": r.product_id, "quantity": r.quantity, "product": r.product,
              "line_total_cents": r.quantity * r.product.price_cents} for r in rows]
    return {"items": items, "total_cents": sum(i["line_total_cents"] for i in items)}

@router.get("", response_model=CartOut)
def get_cart(user: CurrentUser, db: Session = Depends(get_db)):
    return make_cart(db, user.id)

@router.post("/items", response_model=CartOut)
def add_to_cart(payload: CartAddIn, user: CurrentUser, db: Session = Depends(get_db)):
    product = db.get(Product, payload.product_id)
    if not product or not product.in_stock:
        raise HTTPException(status_code=404, detail="Product is unavailable")
    item = db.query(CartItem).filter_by(user_id=user.id, product_id=product.id).first()
    if item:
        if item.quantity + payload.quantity > 20:
            raise HTTPException(status_code=400, detail="Maximum quantity per product is 20")
        item.quantity += payload.quantity
    else:
        db.add(CartItem(user_id=user.id, product_id=product.id, quantity=payload.quantity))
    db.commit()
    return make_cart(db, user.id)

@router.patch("/items/{item_id}", response_model=CartOut)
def update_quantity(item_id: int, payload: CartQuantityIn, user: CurrentUser, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter_by(id=item_id, user_id=user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = payload.quantity
    db.commit()
    return make_cart(db, user.id)

@router.delete("/items/{item_id}", response_model=CartOut)
def remove_item(item_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter_by(id=item_id, user_id=user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return make_cart(db, user.id)
