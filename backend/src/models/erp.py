"""
ERP System Models for KN-Kitchen.
Includes Inventory, Vendor, Purchase, Payment, Staff, and Recipe management.
"""

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import String, Float, DateTime, ForeignKey
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


class PaymentType(str, Enum):
    """Payment type enumeration"""
    ADVANCE = "Advance"
    FULL = "Full"
    PARTIAL = "Partial"


class TransactionType(str, Enum):
    """Staff transaction type enumeration"""
    ADVANCE = "Advance"
    SALARY = "Salary"


class Inventory(SQLModel, table=True):
    """
    Inventory model for tracking stock items.

    Attributes:
        id: Primary key (auto-increment)
        item_name: Name of the inventory item
        current_stock: Current quantity in stock (float)
        unit: Unit of measurement (kg, ltr, pieces, etc.)
        average_price: Average price per unit (Decimal)
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """

    __tablename__ = "inventory"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_name: str = Field(max_length=255, nullable=False, index=True)
    current_stock: float = Field(nullable=False, default=0.0)
    unit: str = Field(max_length=50, nullable=False)  # kg, ltr, pieces, etc.
    average_price: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        nullable=False,
        default=Decimal("0.00")
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationships
    purchase_records: List["PurchaseRecord"] = Relationship(back_populates="inventory_item")
    recipes: List["Recipe"] = Relationship(back_populates="ingredient")


class Vendor(SQLModel, table=True):
    """
    Vendor model for supplier management.

    Attributes:
        id: Primary key (auto-increment)
        name: Vendor name
        contact_info: Contact information (phone, email, address)
        category: Category of vendor (Meat, Grocery, Dairy, etc.)
        created_at: Timestamp of creation
    """

    __tablename__ = "vendors"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False, index=True)
    contact_info: str = Field(max_length=500, nullable=False)
    category: str = Field(max_length=100, nullable=False, index=True)  # Meat, Grocery, etc.
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    # Relationships
    purchase_records: List["PurchaseRecord"] = Relationship(back_populates="vendor")
    payments: List["VendorPayment"] = Relationship(back_populates="vendor")


class PurchaseRecord(SQLModel, table=True):
    """
    Purchase Record model for tracking inventory purchases.

    Attributes:
        id: Primary key (auto-increment)
        vendor_id: Foreign key to Vendor
        inventory_item_id: Foreign key to Inventory
        quantity: Quantity purchased (float)
        rate: Rate per unit (Decimal)
        total_amount: Total purchase amount (Decimal)
        date: Date of purchase
    """

    __tablename__ = "purchase_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendors.id", nullable=False, index=True)
    inventory_item_id: int = Field(foreign_key="inventory.id", nullable=False, index=True)
    quantity: float = Field(nullable=False)
    rate: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    total_amount: Decimal = Field(max_digits=12, decimal_places=2, nullable=False)
    date: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    # Relationships
    vendor: Vendor = Relationship(back_populates="purchase_records")
    inventory_item: Inventory = Relationship(back_populates="purchase_records")


class VendorPayment(SQLModel, table=True):
    """
    Vendor Payment model for tracking payments to vendors.

    Attributes:
        id: Primary key (auto-increment)
        vendor_id: Foreign key to Vendor
        amount_paid: Amount paid (Decimal)
        payment_type: Type of payment (Advance, Full, Partial)
        date: Date of payment
    """

    __tablename__ = "vendor_payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    vendor_id: int = Field(foreign_key="vendors.id", nullable=False, index=True)
    amount_paid: Decimal = Field(max_digits=12, decimal_places=2, nullable=False)
    payment_type: str = Field(
        sa_column=String(20),
        default=PaymentType.FULL.value
    )
    date: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    # Relationships
    vendor: Vendor = Relationship(back_populates="payments")


class Staff(SQLModel, table=True):
    """
    Staff model for employee management.

    Attributes:
        id: Primary key (auto-increment)
        name: Staff member name
        role: Job role/position
        monthly_salary: Monthly salary (Decimal)
        created_at: Timestamp of creation
    """

    __tablename__ = "staff"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False, index=True)
    role: str = Field(max_length=100, nullable=False)
    monthly_salary: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    # Relationships
    transactions: List["StaffTransaction"] = Relationship(back_populates="staff")


class StaffTransaction(SQLModel, table=True):
    """
    Staff Transaction model for tracking salary advances and payments.

    Attributes:
        id: Primary key (auto-increment)
        staff_id: Foreign key to Staff
        amount: Transaction amount (Decimal)
        transaction_type: Type of transaction (Advance, Salary)
        date: Date of transaction
    """

    __tablename__ = "staff_transactions"

    id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="staff.id", nullable=False, index=True)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    transaction_type: str = Field(
        sa_column=String(20),
        default=TransactionType.SALARY.value
    )
    date: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)

    # Relationships
    staff: Staff = Relationship(back_populates="transactions")


class Recipe(SQLModel, table=True):
    """
    Recipe model for linking products to ingredients.

    Attributes:
        id: Primary key (auto-increment)
        product_id: Foreign key to Items table (the finished product)
        ingredient_id: Foreign key to Inventory (the ingredient)
        quantity_required: Quantity of ingredient required (float)
    """

    __tablename__ = "recipes"

    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: int = Field(foreign_key="items.id", nullable=False, index=True)
    ingredient_id: int = Field(foreign_key="inventory.id", nullable=False, index=True)
    quantity_required: float = Field(nullable=False)

    # Relationships
    ingredient: Inventory = Relationship(back_populates="recipes")
