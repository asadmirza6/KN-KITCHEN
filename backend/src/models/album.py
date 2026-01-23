"""
Album model for gallery organization.
Stores photo albums with titles and descriptions.
"""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime


class Album(SQLModel, table=True):
    """
    Album model representing photo galleries/albums.

    Attributes:
        id: Primary key (auto-increment)
        title: Album title/name
        description: Optional event description
        created_at: Timestamp of album creation
    """

    __tablename__ = "albums"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255, nullable=False, index=True)
    description: Optional[str] = Field(
        max_length=1000,
        nullable=True,
        description="Optional album/event description"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "title": "Wedding Event 2026",
                "description": "Beautiful wedding catering at Grand Hotel",
                "created_at": "2026-01-23T10:00:00"
            }
        }
