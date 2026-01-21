"""
Users API endpoints.
Handles user management (ADMIN only).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr
from typing import List

from ..database import get_session
from ..models import User
from ..models.user import UserRole
from ..middleware.auth import require_admin, hash_password


router = APIRouter()


class CreateUserRequest(BaseModel):
    """Request model for creating a new user"""
    name: str
    email: EmailStr
    password: str
    role: str  # "ADMIN" or "STAFF"


class UserResponse(BaseModel):
    """Response model for user data"""
    id: int
    name: str
    email: str
    role: str
    created_at: str


@router.post("/", status_code=201, dependencies=[Depends(require_admin)])
def create_user(
    request: CreateUserRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Create a new user (ADMIN only).

    Only ADMIN users can create new users (both ADMIN and STAFF).
    """
    # Validate role
    try:
        user_role = UserRole(request.role.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be ADMIN or STAFF"
        )

    # Check if email already exists
    existing_user = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
        role=user_role
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role.value,
        "created_at": new_user.created_at.isoformat(),
        "message": "User created successfully"
    }


@router.get("/", dependencies=[Depends(require_admin)])
def list_users(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    List all users (ADMIN only).

    Returns all users with their details (excluding password hashes).
    """
    users = session.exec(select(User)).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "created_at": user.created_at.isoformat()
        }
        for user in users
    ]


@router.get("/me")
def get_current_user_info(
    current_user: User = Depends(require_admin)
):
    """
    Get current authenticated user info.

    Returns current user's details.
    """
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "created_at": current_user.created_at.isoformat()
    }


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Delete a user (ADMIN only).

    Users cannot delete themselves.
    """
    # Prevent self-deletion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    session.delete(user)
    session.commit()

    return {"message": f"User {user.name} deleted successfully"}
