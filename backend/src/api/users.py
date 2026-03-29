"""
Users API endpoints.
Handles user management (ADMIN only).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr
from typing import List

from ..database import get_session
from ..models import User, Order
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
        "role": new_user.role.value if isinstance(new_user.role, UserRole) else new_user.role,
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
            "role": user.role.value if isinstance(user.role, UserRole) else user.role,
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
        "role": current_user.role.value if isinstance(current_user.role, UserRole) else current_user.role,
        "created_at": current_user.created_at.isoformat()
    }


@router.get("/{user_id}/orders", dependencies=[Depends(require_admin)])
def get_user_orders(
    user_id: int,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Get all orders created by a specific user (ADMIN only).

    Returns list of orders created by the specified user.
    """

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    orders = session.exec(
        select(Order).where(Order.user_id == user_id)
    ).all()

    return [
        {
            "id": order.id,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "customer_phone": order.customer_phone,
            "total_amount": str(order.total_amount),
            "advance_payment": str(order.advance_payment),
            "balance": str(order.balance),
            "status": order.status,
            "delivery_date": order.delivery_date,
            "notes": order.notes,
            "created_at": order.created_at.isoformat()
        }
        for order in orders
    ]


@router.put("/{user_id}", dependencies=[Depends(require_admin)])
def update_user(
    user_id: int,
    request: CreateUserRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Update a user's information (ADMIN only).

    Admins can update user's name, email, and role.
    """
    # Prevent self-role changes for security
    if user_id == current_user.id and request.role != current_user.role.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if email already exists (excluding current user)
    existing_user = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    if existing_user and existing_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Update user information
    user.name = request.name
    user.email = request.email

    # Validate and update role
    try:
        user_role = UserRole(request.role.upper())
        user.role = user_role
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be ADMIN or STAFF"
        )

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if isinstance(user.role, UserRole) else user.role,
        "created_at": user.created_at.isoformat(),
        "message": "User updated successfully"
    }


class ResetPasswordRequest(BaseModel):
    """Request model for resetting a user's password"""
    new_password: str


@router.post("/{user_id}/reset-password", dependencies=[Depends(require_admin)])
def reset_user_password(
    user_id: int,
    request: ResetPasswordRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
):
    """
    Reset a user's password (ADMIN only).

    Admins can set a new password for any user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent self-password reset for security
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reset your own password using this endpoint"
        )

    # Hash the new password
    user.password_hash = hash_password(request.new_password)
    session.add(user)
    session.commit()

    return {"message": f"Password reset successfully for user {user.name}"}


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
