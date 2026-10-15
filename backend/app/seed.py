from sqlalchemy import text
from sqlalchemy.orm import Session

from .models import Product, User
from .security import hash_password


PRODUCTS = [
    (
        "Everyday Linen Shirt",
        "Breathable relaxed-fit shirt for everyday wear.",
        "Men",
        3499,
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
    ),
    (
        "Classic Denim Jacket",
        "A timeless denim layer with a clean silhouette.",
        "Men",
        5999,
        "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800",
    ),
    (
        "Minimal White Sneakers",
        "Versatile low-top sneakers for daily wear.",
        "Footwear",
        4999,
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    ),
    (
        "Soft Knit Sweater",
        "A soft knit layer for cooler days.",
        "Women",
        4299,
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",
    ),
    (
        "Everyday Tote Bag",
        "A roomy carry-all for work and weekends.",
        "Accessories",
        2499,
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",
    ),
    (
        "Tailored Chino Pants",
        "Smart-casual chinos with a comfortable fit.",
        "Men",
        3999,
        "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800",
    ),
]


def ensure_user_admin_column(db: Session):
    columns = db.execute(
        text("PRAGMA table_info(users)")
    ).fetchall()

    if columns and not any(
        column[1] == "is_admin" for column in columns
    ):
        db.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"
            )
        )
        db.commit()


def seed_products(db: Session):
    # Avoid inserting duplicate products.
    if db.query(Product).count() > 0:
        return

    for name, description, category, price, image in PRODUCTS:
        product = Product(
            name=name,
            description=description,
            category=category,
            price_cents=price,
            image_url=image,
            in_stock=True,
        )
        db.add(product)

    db.commit()


def seed_admin_user(db: Session):
    ensure_user_admin_column(db)

    email = "admin@stylehub.example"
    password = "Admin123!"

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if user:
        user.hashed_password = hash_password(password)
        user.is_admin = True
    else:
        user = User(
            name="Admin User",
            email=email,
            hashed_password=hash_password(password),
            is_admin=True,
        )
        db.add(user)

    db.commit()
