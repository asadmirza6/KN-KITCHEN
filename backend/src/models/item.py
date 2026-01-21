"""
Item model for menu items.
Stores catering menu items with pricing and images.
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class Item(SQLModel, table=True):
    """
    Item model representing menu items available for catering orders.

    Attributes:
        id: Primary key (auto-increment)
        name: Item name (e.g., "Chicken Biryani")
        price_per_kg: Price per kilogram in currency
        image_url: Cloudinary URL to uploaded image
        cloudinary_public_id: Cloudinary public ID for image deletion
        created_at: Timestamp of item creation
    """

    __tablename__ = "items"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False, index=True)

    # Use Decimal for price (precision matters)
    price_per_kg: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        nullable=False,
        description="Price per kilogram in currency"
    )

    image_url: Optional[str] = Field(
        max_length=500,
        nullable=True,
        description="Cloudinary URL to uploaded image"
    )

    cloudinary_public_id: Optional[str] = Field(
        max_length=255,
        nullable=True,
        description="Cloudinary public ID for image deletion"
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Chicken Biryani",
                "price_per_kg": "250.00",
                "image_url": "/uploads/1705420800_chicken_biryani.jpg",
                "created_at": "2026-01-16T10:00:00"
            }
        }
