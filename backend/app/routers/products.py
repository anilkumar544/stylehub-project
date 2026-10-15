from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Product
from ..schemas import ProductOut

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("", response_model=list[ProductOut])
def list_products(search: str | None = Query(default=None, max_length=80), category: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Product).filter(Product.in_stock.is_(True))
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if category and category.lower() != "all":
        query = query.filter(Product.category.ilike(category))
    return query.order_by(Product.id).all()

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
