"""
MediaAsset model for banners and gallery images.
Stores uploaded media with type (banner/gallery) and active status.
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import String
from typing import Optional
from datetime import datetime
from enum import Enum


class MediaType(str, Enum):
    """Enum for media asset types"""
    banner = "banner"
    gallery = "gallery"
    item = "item"


class MediaAsset(SQLModel, table=True):
    """
    MediaAsset model representing uploaded media (banners, gallery images).

    Attributes:
        id: Primary key (auto-increment)
        type: Media type ('banner', 'gallery', or 'item')
        title: Optional title/description
        image_url: Cloudinary URL to uploaded image
        cloudinary_public_id: Cloudinary public ID for image deletion
        is_active: Whether this asset should be displayed (soft delete)
        created_at: Timestamp of upload
    """

    __tablename__ = "media_assets"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Media type as enum (stored as string in database)
    type: MediaType = Field(sa_column=Column(String(10), nullable=False, index=True))

    title: Optional[str] = Field(
        max_length=255,
        nullable=True,
        description="Optional title or description"
    )

    image_url: str = Field(
        max_length=500,
        nullable=False,
        description="Cloudinary URL to uploaded image"
    )

    cloudinary_public_id: Optional[str] = Field(
        max_length=255,
        nullable=True,
        description="Cloudinary public ID for image deletion"
    )

    is_active: bool = Field(
        default=True,
        nullable=False,
        index=True,
        description="Whether to display this asset (soft delete)"
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "type": "banner",
                "title": "New Year Promotion",
                "image_url": "/uploads/1705420800_banner1.jpg",
                "is_active": True,
                "created_at": "2026-01-16T10:00:00"
            }
        }
