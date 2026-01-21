"""
User model for admin authentication.
Stores administrator accounts with hashed passwords.
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import String
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "ADMIN"
    STAFF = "STAFF"


class User(SQLModel, table=True):
    """
    User model representing administrator and staff accounts.

    Attributes:
        id: Primary key (auto-increment)
        name: User's full name
        email: Unique email address for login
        password_hash: Bcrypt hashed password (never store plain text)
        role: User role (ADMIN or STAFF)
        created_at: Timestamp of account creation
    """

    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False)
    email: str = Field(max_length=255, unique=True, nullable=False, index=True)
    password_hash: str = Field(max_length=255, nullable=False)
    role: UserRole = Field(
        sa_column=Column(String(10), nullable=False, index=True),
        default=UserRole.STAFF,
        description="User role: ADMIN or STAFF"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "John Doe",
                "email": "admin@knkitchen.com",
                "created_at": "2026-01-16T10:00:00"
            }
        }
