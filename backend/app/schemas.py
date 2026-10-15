from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

def _validate_bcrypt_password_length(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 bytes when encoded as UTF-8")
    return password

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, password: str) -> str:
        return _validate_bcrypt_password_length(password)

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, password: str) -> str:
        return _validate_bcrypt_password_length(password)

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_admin: bool = False
    model_config = ConfigDict(from_attributes=True)

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    price_cents: int
    image_url: str
    in_stock: bool
    model_config = ConfigDict(from_attributes=True)

class ProductUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    price_cents: int | None = Field(default=None, ge=1)
    image_url: str | None = Field(default=None, max_length=500)
    in_stock: bool | None = None

class CartAddIn(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=20)

class CartQuantityIn(BaseModel):
    quantity: int = Field(ge=1, le=20)

class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut
    line_total_cents: int

class CartOut(BaseModel):
    items: list[CartItemOut]
    total_cents: int

class CheckoutOut(BaseModel):
    order_id: int
    client_secret: str
    total_cents: int
    currency: str = "usd"

class OrderItemOut(BaseModel):
    product_id: int
    product_name: str
    unit_price_cents: int
    quantity: int

class OrderOut(BaseModel):
    id: int
    total_cents: int
    status: str
    created_at: str
    items: list[OrderItemOut]
