from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Quotation(SQLModel, table=True):
    """Quotation model for managing customer quotations/estimates."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    created_by_name: str = Field(max_length=255)

    # Customer details
    customer_name: str = Field(max_length=255)
    customer_email: str = Field(max_length=255)
    customer_phone: str = Field(max_length=20)
    customer_address: str = Field(max_length=500)

    # Items stored as JSON
    items: List[Dict[str, Any]] = Field(sa_column=Column(JSON, nullable=False, default=[]))
    manual_items: List[Dict[str, Any]] = Field(
        sa_column=Column(JSON, nullable=True, default=[])
    )

    # Monetary values
    total_amount: Decimal = Field(max_digits=10, decimal_places=2)
    advance_payment: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)
    balance: Decimal = Field(max_digits=10, decimal_places=2)
    discount: Decimal = Field(default=Decimal("0.00"), max_digits=10, decimal_places=2)

    # Optional fields
    delivery_date: Optional[str] = Field(default=None, max_length=50)
    valid_until: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = Field(default=None, max_length=500)

    # Status: pending, approved, rejected
    status: str = Field(default="pending", max_length=20, index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
