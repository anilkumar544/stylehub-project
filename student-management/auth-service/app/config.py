import os

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
if len(SECRET_KEY) < 32 or SECRET_KEY.startswith("replace-"):
    raise RuntimeError("Set SECRET_KEY to a random value of at least 32 characters.")

ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))
DATABASE_URL = os.getenv("AUTH_DATABASE_URL", "sqlite:///./auth.db")
