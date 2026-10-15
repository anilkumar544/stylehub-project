from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import CurrentAdminUser
from ..models import Order, Product
from ..routers.orders import order_dict
from ..schemas import ProductOut, ProductUpdateIn

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/summary")
def admin_summary(user: CurrentAdminUser, db: Session = Depends(get_db)):
    product_count = db.query(Product).count()
    order_count = db.query(Order).count()
    paid_count = db.query(Order).filter(Order.status == "paid").count()
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email, "is_admin": True},
        "stats": {"products": product_count, "orders": order_count, "paid_orders": paid_count},
    }


@router.get("/products", response_model=list[ProductOut])
def admin_products(user: CurrentAdminUser, db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id).all()


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdateIn, user: CurrentAdminUser, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.name is not None:
        product.name = payload.name.strip()
    if payload.description is not None:
        product.description = payload.description.strip()
    if payload.category is not None:
        product.category = payload.category.strip()
    if payload.price_cents is not None:
        product.price_cents = payload.price_cents
    if payload.image_url is not None:
        product.image_url = payload.image_url
    if payload.in_stock is not None:
        product.in_stock = payload.in_stock

    db.commit()
    db.refresh(product)
    return product


@router.get("/orders")
def admin_orders(user: CurrentAdminUser, db: Session = Depends(get_db)):
    orders = db.query(Order).options(joinedload(Order.items)).order_by(Order.id.desc()).all()
    return [order_dict(order) for order in orders]
