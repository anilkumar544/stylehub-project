import secrets

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32), min_length=32)
    access_token_expire_minutes: int = 60
    database_url: str = "sqlite:///./stylehub.db"
    frontend_origin: str = "http://localhost:5173"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if value.startswith("replace-") or value.startswith("change-"):
            raise ValueError("Replace the example SECRET_KEY with a unique random value")
        return value

    @field_validator("stripe_secret_key")
    @classmethod
    def validate_stripe_secret_key(cls, value: str) -> str:
        if value and not value.startswith("sk_test_"):
            raise ValueError("Only Stripe test-mode secret keys are supported")
        return value

settings = Settings()
