"""
Package model for special deals and packages.
Stores catering packages/deals with images and validity information.
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime


class Package(SQLModel, table=True):
    """
    Package model representing special deals and packages available for catering.

    Attributes:
        id: Primary key (auto-increment)
        name: Package name (e.g., "Wedding Special Package")
        description: Package description for display
        image_url: Cloudinary URL to uploaded image
        cloudinary_public_id: Cloudinary public ID for image deletion
        validity: Validity period or offer details (e.g., "Valid until Dec 31, 2026")
        created_at: Timestamp of package creation
    """

    __tablename__ = "packages"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False, index=True)

    description: Optional[str] = Field(
        default=None,
        max_length=2000,
        nullable=True,
        description="Package description for display"
    )

    image_url: Optional[str] = Field(
        default=None,
        max_length=500,
        nullable=True,
        description="Cloudinary URL to uploaded image"
    )

    cloudinary_public_id: Optional[str] = Field(
        default=None,
        max_length=255,
        nullable=True,
        description="Cloudinary public ID for image deletion"
    )

    validity: Optional[str] = Field(
        default=None,
        max_length=255,
        nullable=True,
        description="Validity period or offer details"
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Wedding Special Package",
                "description": "Complete catering solution for weddings with appetizers, main course, and desserts",
                "image_url": "https://res.cloudinary.com/example/image/upload/v1234567890/package.jpg",
                "validity": "Valid until Dec 31, 2026",
                "created_at": "2026-04-10T10:00:00"
            }
        }
