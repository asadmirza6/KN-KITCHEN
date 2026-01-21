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

    - **name**: Full name of the administrator
    - **email**: Unique email address (used for login)
    - **password**: Password (will be hashed before storage)

    Returns JWT token and user information.
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

    # Hash password
    hashed_password = hash_password(request.password)

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

    - **email**: User's email address
    - **password**: User's password

    Returns JWT token and user information.
    """
    # Find user by email
    user = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    # Verify user exists and password is correct
    if not user or not verify_password(request.password, user.password_hash):
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

    Note: JWT tokens are stateless. The client must remove the token
    from storage (localStorage) to log out. This endpoint is provided
    for consistency but doesn't need to do anything server-side.
    """
    return {"message": "Logged out successfully. Remove token from client storage."}
