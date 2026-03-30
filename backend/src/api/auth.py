"""
Authentication API endpoints.
Handles user signup, login, and logout operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select

from ..database import get_session
from ..models import User
from ..middleware.auth import hash_password, verify_password, create_access_token


router = APIRouter()


# Request/Response Models
class SignupRequest(BaseModel):
    """Request body for user signup"""
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """Request body for user login"""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Response body for successful authentication"""
    token: str
    user: dict


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(
    request: SignupRequest,
    session: Session = Depends(get_session)
):
    """
    Create a new admin user account.
    """
    # Check if user with email already exists
    existing_user = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists"
        )

    # FIX: Ensure password is within bcrypt limits (72 bytes)
    safe_password = request.password[:72]
    hashed_password = hash_password(safe_password)

    # Create new user
    user = User(
        name=request.name,
        email=request.email,
        password_hash=hashed_password
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    # Generate JWT token
    access_token = create_access_token(data={"sub": user.email})

    return {
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role if isinstance(user.role, str) else user.role.value,
            "created_at": user.created_at.isoformat()
        }
    }


@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    session: Session = Depends(get_session)
):
    """
    Authenticate user and return JWT token.
    """
    # Find user by email
    user = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    # FIX: Truncate incoming password to 72 chars to prevent Bcrypt ValueError
    # This ensures that even if a long string is sent, it won't crash the server.
    safe_password = request.password[:72]

    # Verify user exists and password is correct
    if not user or not verify_password(safe_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWT token
    access_token = create_access_token(data={"sub": user.email})

    return {
        "token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role if isinstance(user.role, str) else user.role.value,
            "created_at": user.created_at.isoformat()
        }
    }


@router.post("/logout")
def logout():
    """
    Logout endpoint (client-side token removal).
    """
    return {"message": "Logged out successfully. Remove token from client storage."}