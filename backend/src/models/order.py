"""
Order model for catering orders.
Stores customer orders with items (JSON), amounts, and payments.
"""

from sqlmodel import SQLModel, Field, Column, JSON
from sqlalchemy import String
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


class Order(SQLModel, table=True):
    """
    Order model representing catering orders.

    Attributes:
        id: Primary key (auto-increment)
        user_id: Foreign key to users table (user who created the order)
        created_by_name: Name of the user who created the order
        items: JSON array of {item_id, quantity} objects
        total_amount: Total order amount (calculated from item prices)
        advance_payment: Amount paid in advance
        balance: Remaining balance (total_amount - advance_payment)
        created_at: Timestamp of order creation
    """

    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    created_by_name: str = Field(max_length=255, nullable=False, description="Name of user who created this order")

    # Customer details
    customer_name: str = Field(max_length=255, nullable=False)
    customer_email: str = Field(max_length=255, nullable=False)
    customer_phone: str = Field(max_length=20, nullable=False)
    customer_address: str = Field(max_length=500, nullable=False)

    # Store items as JSON: [{"item_id": 1, "item_name": "...", "quantity_kg": 10, "price_per_kg": 100, "subtotal": 1000}, ...]
    items: List[Dict[str, Any]] = Field(
        sa_column=Column(JSON, nullable=False)
    )

    # Store manual items as JSON: [{"name": "Plastic Box", "quantity_kg": 2, "price_per_kg": 50, "subtotal": 100}, ...]
    manual_items: List[Dict[str, Any]] = Field(
        sa_column=Column(JSON, nullable=True, default=[]),
        default=[]
    )

    # Use Decimal for monetary values (precision matters)
    total_amount: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        nullable=False,
        description="Total order amount in currency"
    )
    advance_payment: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        nullable=False,
        description="Advance payment received"
    )
    balance: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        nullable=False,
        description="Remaining balance (total - advance)"
    )
    discount: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        nullable=False,
        description="Discount applied to order"
    )

    # Additional fields
    delivery_date: Optional[str] = Field(max_length=50, nullable=True, description="Delivery date (optional)")
    notes: Optional[str] = Field(max_length=500, nullable=True, description="Additional notes (optional)")
    status: str = Field(max_length=20, default="pending", nullable=False, index=True, description="Order status: pending, partial, paid, cancelled")

    # Profit tracking
    calculated_profit: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        nullable=False,
        description="Calculated profit when order is completed"
    )
    profit_margin: Decimal = Field(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        nullable=False,
        description="Profit margin percentage"
    )
    total_cost: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        nullable=False,
        description="Total ingredient cost for the order"
    )

    menu_item_id: Optional[int] = Field(
        default=None,
        nullable=True,
        description="Reference to menu item for recipe lookup"
    )

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "items": [
                    {"item_id": 1, "quantity": 10},
                    {"item_id": 2, "quantity": 5}
                ],
                "total_amount": "1500.00",
                "advance_payment": "500.00",
                "balance": "1000.00",
                "created_at": "2026-01-16T10:00:00"
            }
        }
