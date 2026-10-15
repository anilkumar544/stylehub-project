from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine, SessionLocal
from . import models
from .seed import seed_admin_user, seed_products
from .routers import admin, auth, products, cart, orders

# Create database tables
Base.metadata.create_all(bind=engine)

# Seed initial data
with SessionLocal() as db:
    seed_products(db)
    seed_admin_user(db)

app = FastAPI(title="StyleHub API", version="1.0.0", description="Fashion Mini Store API")
app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_origin], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Welcome to StyleHub API", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok"}
