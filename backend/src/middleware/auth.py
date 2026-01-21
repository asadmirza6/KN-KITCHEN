"""
JWT Authentication Middleware.
Provides token generation, verification, and user authentication dependencies.
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from ..config import settings
from ..database import get_session
from ..models import User


# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """
    Hash a plain text password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a hashed password.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Dictionary of claims to encode in the token (e.g., {"sub": "user@example.com"})
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.jwt_expire_days)

    to_encode.update({"exp": expire})

    # Encode token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.better_auth_secret,
        algorithm=settings.jwt_algorithm
    )

    return encoded_jwt


def verify_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    FastAPI dependency to verify JWT token and return authenticated user.

    Usage:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(verify_jwt)):
            return {"user": current_user.email}

    Args:
        credentials: HTTP Bearer token from Authorization header
        session: Database session

    Returns:
        Authenticated User object

    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode token
        payload = jwt.decode(
            credentials.credentials,
            settings.better_auth_secret,
            algorithms=[settings.jwt_algorithm]
        )

        # Extract user email from token
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Fetch user from database
    statement = select(User).where(User.email == email)
    user = session.exec(statement).first()

    if user is None:
        raise credentials_exception

    return user


# Alias for backward compatibility
get_current_user = verify_jwt


def require_admin(
    current_user: User = Depends(verify_jwt)
) -> User:
    """
    FastAPI dependency to require ADMIN role.

    Usage:
        @app.post("/admin-only")
        def admin_route(current_user: User = Depends(require_admin)):
            return {"message": "Admin access granted"}

    Args:
        current_user: Authenticated user from verify_jwt

    Returns:
        User object if user is ADMIN

    Raises:
        HTTPException: 403 if user is not ADMIN
    """
    from ..models.user import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def require_staff_or_admin(
    current_user: User = Depends(verify_jwt)
) -> User:
    """
    FastAPI dependency to require STAFF or ADMIN role.

    Usage:
        @app.post("/staff-access")
        def staff_route(current_user: User = Depends(require_staff_or_admin)):
            return {"message": "Access granted"}

    Args:
        current_user: Authenticated user from verify_jwt

    Returns:
        User object if user is STAFF or ADMIN

    Raises:
        HTTPException: 403 if user has no valid role
    """
    from ..models.user import UserRole

    if current_user.role not in [UserRole.ADMIN, UserRole.STAFF]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or Admin access required"
        )

    return current_user
