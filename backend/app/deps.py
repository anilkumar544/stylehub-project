from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .models import User
from .security import decode_subject


# Require a Bearer token in protected API requests
oauth2_scheme = HTTPBearer(auto_error=False)

# Database dependency
DB = Annotated[Session, Depends(get_db)]


def current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(oauth2_scheme),
    ],
    db: DB,
) -> User:
    """Validate the access token and return the authenticated user."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    subject = decode_subject(credentials.credentials)

    if not subject or not str(subject).isdecimal():
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, int(subject))

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def admin_user(
    user: Annotated[User, Depends(current_user)],
) -> User:
    """Require an authenticated administrator."""

    if not user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return user


# Reusable dependencies for protected routes
CurrentUser = Annotated[User, Depends(current_user)]
CurrentAdminUser = Annotated[User, Depends(admin_user)]
