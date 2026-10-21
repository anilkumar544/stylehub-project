import os

from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "")
if len(SECRET_KEY) < 32 or SECRET_KEY.startswith("replace-"):
    raise RuntimeError("Set SECRET_KEY to a random value of at least 32 characters.")

ALGORITHM = "HS256"
DATABASE_URL = os.getenv("COURSE_DATABASE_URL", "sqlite:///./courses.db")
STUDENT_SERVICE_URL = os.getenv("STUDENT_SERVICE_URL", "http://127.0.0.1:8002")
