---
name: SQLModel ORM Usage
description: Best practices for SQLModel ORM including table relationships, indexing, transaction safety, and query optimization
scope: mandatory
applies_to: backend
---

# SQLModel ORM Usage

**Status**: MANDATORY - All database code MUST follow these patterns

## Overview

SQLModel combines SQLAlchemy's ORM capabilities with Pydantic's validation. It is the REQUIRED ORM for KN KITCHEN backend database operations.

**Technology Stack:**
- SQLModel (ORM + validation)
- PostgreSQL (Neon managed instance)
- Alembic (migrations - optional, for production)

## Core Principles

1. **Database Constraints First**: Enforce business rules at database level
2. **Explicit Relationships**: Define foreign keys and relationships clearly
3. **Index Strategically**: Index for queries, not every column
4. **Transaction Safety**: ACID guarantees through proper session management
5. **Eager Loading**: Avoid N+1 queries with relationship loading strategies

## 1. Table Relationships

SQLModel supports three relationship types: one-to-many, many-to-one, and many-to-many.

### One-to-Many Relationships

```python
# ✅ CORRECT: Customer has many Orders
# backend/src/models/customer.py
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class Customer(SQLModel, table=True):
    """Customer entity - one customer has many orders"""
    __tablename__ = "customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, nullable=False, index=True)
    email: str = Field(max_length=255, nullable=False, unique=True)
    phone: Optional[str] = Field(max_length=20)
    billing_address: Optional[str] = Field(max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship: one customer -> many orders
    orders: List["Order"] = Relationship(back_populates="customer")

# backend/src/models/order.py
from decimal import Decimal

class Order(SQLModel, table=True):
    """Order entity - many orders belong to one customer"""
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customers.id", nullable=False, index=True)
    status: str = Field(max_length=20, nullable=False, index=True)  # draft, confirmed, billed
    subtotal: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    tax: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    total: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    delivery_date: date = Field(nullable=False, index=True)
    notes: Optional[str] = Field(max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship: many orders -> one customer
    customer: Customer = Relationship(back_populates="orders")

    # Relationship: one order -> many line items
    line_items: List["OrderLineItem"] = Relationship(back_populates="order")
```

### Many-to-One Relationships

```python
# ✅ CORRECT: Many OrderLineItems belong to one Order
# backend/src/models/order_line_item.py

class OrderLineItem(SQLModel, table=True):
    """Order line item - many items belong to one order"""
    __tablename__ = "order_line_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", nullable=False, index=True)
    item_id: str = Field(max_length=100, nullable=False)  # Sanity CMS ID
    item_name: str = Field(max_length=255, nullable=False)
    quantity: int = Field(ge=1, nullable=False)
    price_at_order: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    subtotal: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)

    # Relationship: many line items -> one order
    order: Order = Relationship(back_populates="line_items")
```

### Many-to-Many Relationships (with Link Table)

```python
# ✅ CORRECT: Many-to-Many with explicit link table
# Example: Orders can have multiple tags, tags can apply to multiple orders

# backend/src/models/order_tag_link.py
class OrderTagLink(SQLModel, table=True):
    """Link table for Order <-> Tag many-to-many"""
    __tablename__ = "order_tag_links"

    order_id: int = Field(foreign_key="orders.id", primary_key=True)
    tag_id: int = Field(foreign_key="tags.id", primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# backend/src/models/tag.py
class Tag(SQLModel, table=True):
    """Tag entity - reusable labels for orders"""
    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, nullable=False, unique=True)

    # Many-to-many relationship through link table
    orders: List["Order"] = Relationship(
        back_populates="tags",
        link_model=OrderTagLink
    )

# Update Order model
class Order(SQLModel, table=True):
    # ... existing fields ...

    # Many-to-many relationship
    tags: List[Tag] = Relationship(
        back_populates="orders",
        link_model=OrderTagLink
    )
```

### Relationship Loading Strategies

```python
# ✅ CORRECT: Lazy loading (default) - relationship loaded on access
from sqlmodel import Session, select

def get_customer(customer_id: int, session: Session) -> Customer:
    """Lazy loading - orders loaded when accessed"""
    customer = session.get(Customer, customer_id)
    # Orders are NOT loaded yet

    for order in customer.orders:  # Loads orders NOW (separate query)
        print(order.total)

    return customer

# ✅ CORRECT: Eager loading - load relationships upfront (avoid N+1)
from sqlalchemy.orm import selectinload

def get_customer_with_orders(customer_id: int, session: Session) -> Customer:
    """Eager loading - orders loaded in single query"""
    statement = (
        select(Customer)
        .where(Customer.id == customer_id)
        .options(selectinload(Customer.orders))  # Load orders eagerly
    )
    customer = session.exec(statement).first()
    # Orders are ALREADY loaded

    for order in customer.orders:  # No additional query
        print(order.total)

    return customer

# ✅ CORRECT: Nested eager loading - load deeply nested relationships
def get_customer_with_orders_and_items(customer_id: int, session: Session) -> Customer:
    """Eager load customer -> orders -> line_items"""
    statement = (
        select(Customer)
        .where(Customer.id == customer_id)
        .options(
            selectinload(Customer.orders).selectinload(Order.line_items)
        )
    )
    return session.exec(statement).first()
```

### Relationship Cascade Behaviors

```python
# ✅ CORRECT: Cascade deletes for dependent data
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

class Order(SQLModel, table=True):
    # ... existing fields ...

    # Cascade: When order is deleted, delete all line items
    line_items: List["OrderLineItem"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

# Usage
def delete_order(order_id: int, session: Session):
    """Deleting order automatically deletes line items"""
    order = session.get(Order, order_id)
    session.delete(order)
    session.commit()
    # All line_items for this order are also deleted
```

**Cascade Options:**
- `all, delete-orphan`: Delete children when parent deleted
- `all`: Cascade save, update, delete, refresh
- `save-update`: Only cascade saves and updates
- `delete`: Only cascade deletes
- `none`: No cascading (default)

**Warning**: Use cascades carefully. Confirmed orders should NOT cascade delete (violates data integrity principle).

```python
# ❌ WRONG: Cascade delete on confirmed orders
class Customer(SQLModel, table=True):
    orders: List["Order"] = Relationship(
        back_populates="customer",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}  # DANGEROUS!
    )
    # Deleting customer would delete all orders - violates constitution!

# ✅ CORRECT: No cascade for critical business data
class Customer(SQLModel, table=True):
    orders: List["Order"] = Relationship(back_populates="customer")
    # Must manually handle or prevent customer deletion if orders exist
```

## 2. Indexing Strategy

Indexes improve query performance but add write overhead. Index strategically.

### When to Add Indexes

**ALWAYS Index:**
1. Primary keys (automatic)
2. Foreign keys (relationships)
3. Unique constraints (email, username)
4. Frequently filtered columns (status, date ranges)
5. Frequently sorted columns (ORDER BY clauses)

**CONSIDER Indexing:**
1. Columns in JOIN conditions
2. Columns in WHERE clauses for common queries
3. Columns in GROUP BY clauses

**AVOID Indexing:**
1. Low-cardinality columns (boolean, enum with few values)
2. Frequently updated columns (high write overhead)
3. Small tables (<1000 rows)

### Index Examples

```python
# ✅ CORRECT: Strategic indexing
from sqlmodel import SQLModel, Field, Index

class Order(SQLModel, table=True):
    __tablename__ = "orders"
    __table_args__ = (
        # Composite index for common query: status + delivery_date
        Index("ix_orders_status_delivery", "status", "delivery_date"),
        # Composite index for customer orders by date
        Index("ix_orders_customer_created", "customer_id", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)  # Auto-indexed
    customer_id: int = Field(foreign_key="customers.id", index=True)  # Indexed FK
    status: str = Field(max_length=20, index=True)  # Filtered often
    delivery_date: date = Field(index=True)  # Filtered and sorted
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    notes: Optional[str]  # NOT indexed - free text, rarely filtered

class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)  # Unique = auto-indexed
    name: str = Field(index=True)  # Searched and sorted
    phone: Optional[str]  # NOT indexed - optional, rarely searched
```

### Composite Indexes

```python
# ✅ CORRECT: Composite index for multi-column queries
class Invoice(SQLModel, table=True):
    __tablename__ = "invoices"
    __table_args__ = (
        # Index for: WHERE order_id = X AND status = Y
        Index("ix_invoices_order_status", "order_id", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    status: str = Field(max_length=20)  # paid, unpaid, void
    created_at: datetime

# Query that uses composite index
def get_unpaid_invoices_for_order(order_id: int, session: Session):
    """Uses ix_invoices_order_status composite index"""
    statement = (
        select(Invoice)
        .where(Invoice.order_id == order_id)
        .where(Invoice.status == "unpaid")
    )
    return session.exec(statement).all()
```

**Composite Index Rules:**
- Order matters: Index(A, B) helps queries on (A) or (A, B), but NOT (B)
- Most selective column first for range queries
- Exact match columns before range columns

```python
# ✅ CORRECT: Selective column first
Index("ix_orders_customer_date", "customer_id", "created_at")
# Good for: WHERE customer_id = X AND created_at > Y
# Also good for: WHERE customer_id = X

# ❌ LESS OPTIMAL: Range column first
Index("ix_orders_date_customer", "created_at", "customer_id")
# Good for: WHERE created_at > X
# NOT good for: WHERE customer_id = X
```

### Partial Indexes (PostgreSQL)

```python
# ✅ CORRECT: Partial index for subset of data
from sqlalchemy import Index, text

class Order(SQLModel, table=True):
    __tablename__ = "orders"
    __table_args__ = (
        # Index only draft orders (smaller, faster for common query)
        Index(
            "ix_orders_draft_created",
            "created_at",
            postgresql_where=text("status = 'draft'")
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    status: str
    created_at: datetime
```

## 3. Transaction Safety

Transactions ensure ACID guarantees. Always use transactions for multi-step operations.

### Session Management

```python
# ✅ CORRECT: Auto-commit/rollback with context manager
# backend/src/database.py
from sqlmodel import Session, create_engine
from contextlib import contextmanager

engine = create_engine(DATABASE_URL)

@contextmanager
def get_session():
    """Session with automatic commit/rollback"""
    session = Session(engine)
    try:
        yield session
        session.commit()  # Commit if no exception
    except Exception:
        session.rollback()  # Rollback on exception
        raise
    finally:
        session.close()

# Usage in service
def create_order(order_data, session: Session):
    """Session managed by dependency injection"""
    order = Order(**order_data)
    session.add(order)
    # session.commit() called automatically by dependency

    return order
```

### Explicit Transactions

```python
# ✅ CORRECT: Explicit transaction for multi-step operation
def transfer_order_to_customer(
    order_id: int,
    new_customer_id: int,
    session: Session
):
    """Transfer order - requires transaction"""
    # Begin transaction (implicit with session)
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    old_customer = session.get(Customer, order.customer_id)
    new_customer = session.get(Customer, new_customer_id)

    if not new_customer:
        raise ValueError("New customer not found")

    # Multi-step operation - all or nothing
    order.customer_id = new_customer_id
    old_customer.updated_at = datetime.utcnow()
    new_customer.updated_at = datetime.utcnow()

    session.add_all([order, old_customer, new_customer])
    session.commit()  # Atomic commit - all changes or none

    return order
```

### Transaction Isolation Levels

```python
# ✅ CORRECT: Set isolation level for specific transactions
from sqlalchemy import create_engine

# Default: READ COMMITTED (PostgreSQL default)
engine = create_engine(DATABASE_URL)

# Serializable for critical financial operations
from sqlalchemy import create_engine

def create_invoice_with_lock(order_id: int, session: Session):
    """Use serializable isolation for invoice generation"""
    from sqlalchemy import text

    # Set transaction isolation
    session.execute(text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE"))

    # Check if invoice already exists (prevent duplicate)
    existing = session.exec(
        select(Invoice).where(Invoice.order_id == order_id)
    ).first()

    if existing:
        raise ValueError("Invoice already exists")

    # Create invoice (no race condition possible)
    invoice = Invoice(order_id=order_id, ...)
    session.add(invoice)
    session.commit()

    return invoice
```

**Isolation Levels:**
- `READ UNCOMMITTED`: Dirty reads possible (avoid)
- `READ COMMITTED`: Default, prevents dirty reads
- `REPEATABLE READ`: Prevents non-repeatable reads
- `SERIALIZABLE`: Strictest, prevents phantom reads

**Default for KN KITCHEN**: Use `READ COMMITTED`. Only use `SERIALIZABLE` for critical financial operations with explicit justification.

### Optimistic Locking (Version Control)

```python
# ✅ CORRECT: Optimistic locking for concurrent updates
from sqlalchemy import Column, Integer

class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int
    total: Decimal
    version: int = Field(default=1, sa_column=Column(Integer, nullable=False))
    # ... other fields ...

def update_order_with_version_check(
    order_id: int,
    updates: dict,
    expected_version: int,
    session: Session
):
    """Update order with optimistic lock"""
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    if order.version != expected_version:
        raise ValueError(
            f"Order was modified by another user. "
            f"Expected version {expected_version}, got {order.version}"
        )

    # Apply updates
    for key, value in updates.items():
        setattr(order, key, value)

    # Increment version
    order.version += 1

    session.add(order)
    session.commit()

    return order
```

### Pessimistic Locking (SELECT FOR UPDATE)

```python
# ✅ CORRECT: Pessimistic locking for critical updates
from sqlalchemy import select

def confirm_order_with_lock(order_id: int, session: Session):
    """Lock order row during confirmation"""
    # SELECT FOR UPDATE - locks row until transaction commits
    statement = (
        select(Order)
        .where(Order.id == order_id)
        .with_for_update()  # Row-level lock
    )

    order = session.exec(statement).first()
    if not order:
        raise ValueError("Order not found")

    if order.status != "draft":
        raise ValueError(f"Cannot confirm order in status: {order.status}")

    # Transition state (no other transaction can modify this order)
    order.status = "confirmed"
    order.updated_at = datetime.utcnow()

    session.add(order)
    session.commit()  # Lock released on commit

    return order
```

**When to Use Locking:**
- **Optimistic**: Concurrent reads, rare conflicts (preferred)
- **Pessimistic**: High-conflict operations, critical state transitions

## 4. Avoiding N+1 Queries

N+1 queries are a common performance problem. Load relationships efficiently.

### The N+1 Problem

```python
# ❌ WRONG: N+1 query problem
def get_all_customers_with_orders(session: Session):
    """INEFFICIENT: 1 query for customers + N queries for orders"""
    customers = session.exec(select(Customer)).all()  # 1 query

    result = []
    for customer in customers:  # N iterations
        customer_data = {
            "name": customer.name,
            "orders": customer.orders  # N additional queries!
        }
        result.append(customer_data)

    return result
    # Total queries: 1 + N (if 100 customers, 101 queries!)
```

### Solution 1: Eager Loading with selectinload

```python
# ✅ CORRECT: Eager loading - 2 queries total
from sqlalchemy.orm import selectinload

def get_all_customers_with_orders(session: Session):
    """EFFICIENT: 2 queries total (customers + all orders)"""
    statement = (
        select(Customer)
        .options(selectinload(Customer.orders))  # Load orders eagerly
    )
    customers = session.exec(statement).all()  # 2 queries total

    result = []
    for customer in customers:
        customer_data = {
            "name": customer.name,
            "orders": customer.orders  # Already loaded, no query
        }
        result.append(customer_data)

    return result
    # Total queries: 2 (customers + all orders in single query)
```

### Solution 2: Eager Loading with joinedload

```python
# ✅ CORRECT: Joined eager loading - 1 query with JOIN
from sqlalchemy.orm import joinedload

def get_customer_with_orders(customer_id: int, session: Session):
    """EFFICIENT: 1 query with LEFT OUTER JOIN"""
    statement = (
        select(Customer)
        .where(Customer.id == customer_id)
        .options(joinedload(Customer.orders))  # SQL JOIN
    )
    return session.exec(statement).first()
    # Total queries: 1 (customers LEFT JOIN orders)
```

**selectinload vs joinedload:**
- `selectinload`: 2 queries (parent, then children with WHERE IN). Better for one-to-many with many children.
- `joinedload`: 1 query with JOIN. Better for one-to-one or one-to-many with few children.
- `subqueryload`: 2 queries with subquery. Rarely needed.

### Solution 3: Nested Eager Loading

```python
# ✅ CORRECT: Load deeply nested relationships
from sqlalchemy.orm import selectinload

def get_customers_with_orders_and_items(session: Session):
    """Load customers -> orders -> line_items efficiently"""
    statement = (
        select(Customer)
        .options(
            selectinload(Customer.orders).selectinload(Order.line_items)
        )
    )
    customers = session.exec(statement).all()
    # Total queries: 3 (customers, orders, line_items)

    for customer in customers:
        for order in customer.orders:
            for item in order.line_items:  # No additional queries
                print(item.item_name)

    return customers
```

### Solution 4: Manual Batching

```python
# ✅ CORRECT: Manual batching for complex scenarios
def get_orders_with_customer_names(session: Session):
    """Manually batch load customers"""
    # Load all orders
    orders = session.exec(select(Order)).all()

    # Extract unique customer IDs
    customer_ids = {order.customer_id for order in orders}

    # Batch load all customers
    customers = session.exec(
        select(Customer).where(Customer.id.in_(customer_ids))
    ).all()

    # Create lookup map
    customer_map = {c.id: c for c in customers}

    # Build result
    result = []
    for order in orders:
        result.append({
            "order_id": order.id,
            "customer_name": customer_map[order.customer_id].name  # O(1) lookup
        })

    return result
    # Total queries: 2 (orders + batch customers)
```

### Query Performance Monitoring

```python
# ✅ CORRECT: Log queries in development to detect N+1
import logging

# Enable SQLAlchemy query logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Or use engine echo
engine = create_engine(DATABASE_URL, echo=True)  # Logs all queries

# Count queries in tests
from unittest.mock import patch

def test_no_n_plus_1():
    """Test that endpoint doesn't cause N+1 queries"""
    with patch('sqlalchemy.engine.Engine.execute') as mock_execute:
        # Call function
        get_all_customers_with_orders(session)

        # Assert query count
        assert mock_execute.call_count <= 3, "Too many queries (N+1 detected)"
```

## Best Practices Checklist

Before merging database code:

- [ ] **Relationships Defined**: Foreign keys and `Relationship()` explicitly declared
- [ ] **Indexes Strategic**: FK, unique, and frequently-queried columns indexed
- [ ] **Composite Indexes**: Multi-column queries have composite indexes
- [ ] **Constraints Enforced**: Database constraints (NOT NULL, CHECK, UNIQUE) enforce business rules
- [ ] **Transactions Used**: Multi-step operations wrapped in transactions
- [ ] **Eager Loading**: Relationships loaded with `selectinload`/`joinedload` to avoid N+1
- [ ] **Cascade Carefully**: Cascade deletes only for truly dependent data (not business entities)
- [ ] **Session Managed**: Sessions use dependency injection with auto-commit/rollback
- [ ] **Locks Justified**: Optimistic or pessimistic locking used only when needed
- [ ] **Queries Tested**: Test for N+1 queries in development with logging

## Common Patterns

### Pattern: Soft Delete

```python
# ✅ CORRECT: Soft delete for confirmed orders
from datetime import datetime
from typing import Optional

class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int
    status: str
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    # ... other fields ...

def soft_delete_order(order_id: int, session: Session):
    """Mark order as deleted instead of removing"""
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    order.deleted_at = datetime.utcnow()
    session.add(order)
    session.commit()

def get_active_orders(session: Session):
    """Query excludes soft-deleted orders"""
    return session.exec(
        select(Order).where(Order.deleted_at.is_(None))
    ).all()
```

### Pattern: Audit Trail

```python
# ✅ CORRECT: Audit log for state changes
class OrderAuditLog(SQLModel, table=True):
    __tablename__ = "order_audit_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    user_id: int = Field(foreign_key="users.id")
    action: str = Field(max_length=50)  # created, confirmed, cancelled
    old_status: Optional[str]
    new_status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    notes: Optional[str]

def confirm_order_with_audit(order_id: int, user_id: int, session: Session):
    """Confirm order and log the transition"""
    order = session.get(Order, order_id)
    old_status = order.status

    # State transition
    order.status = "confirmed"

    # Audit log
    log = OrderAuditLog(
        order_id=order.id,
        user_id=user_id,
        action="confirmed",
        old_status=old_status,
        new_status="confirmed"
    )

    session.add_all([order, log])
    session.commit()

    return order
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Data Integrity principles)
- System Architecture: `.claude/skills/system-architecture.md` (Domain boundaries)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Session dependency injection)

---

**Remember**: The database is the source of truth. Enforce constraints at the database level, use transactions for consistency, and load relationships efficiently to maintain performance.
