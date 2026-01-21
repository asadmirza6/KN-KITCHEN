---
name: Order Calculation Logic
description: Best practices for order calculations including rate × quantity, backend-only totals, advance/remaining logic, and rounding safety
scope: mandatory
applies_to: backend
---

# Order Calculation Logic

**Status**: MANDATORY - All financial calculations MUST follow these patterns

## Overview

Order calculations in KN KITCHEN involve money. Incorrect calculations damage customer trust and create accounting issues. All calculations MUST be performed on the backend with proper decimal precision.

**Critical Rule**: Financial calculations NEVER happen on the frontend. The backend calculates; the frontend displays.

## Core Principles

1. **Backend-Only Calculations**: All money calculations happen on server
2. **Decimal Precision**: Use `Decimal` type, never floats for money
3. **Explicit Rounding**: Round explicitly with banker's rounding
4. **Validation**: Verify calculations match expected totals
5. **Audit Trail**: Log all calculation steps for debugging

## 1. Rate × Quantity Calculations

Calculate line item subtotals from menu prices and quantities.

### Basic Line Item Calculation

```python
# ✅ CORRECT: Line item calculation with Decimal
# backend/src/services/order_service.py
from decimal import Decimal, ROUND_HALF_EVEN

def calculate_line_item_subtotal(
    price: Decimal,
    quantity: int
) -> Decimal:
    """
    Calculate line item subtotal

    Args:
        price: Unit price (from Sanity, 2 decimal places)
        quantity: Quantity ordered (integer)

    Returns:
        Subtotal rounded to 2 decimal places

    Example:
        price = Decimal("12.50")
        quantity = 3
        subtotal = Decimal("37.50")
    """
    if quantity <= 0:
        raise ValueError("Quantity must be positive")

    if price < 0:
        raise ValueError("Price cannot be negative")

    # Calculate subtotal
    subtotal = price * Decimal(str(quantity))

    # Round to 2 decimal places (banker's rounding)
    return subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


# ❌ WRONG: Using float for money calculations
def calculate_line_item_subtotal_wrong(price: float, quantity: int) -> float:
    """NEVER USE FLOATS FOR MONEY"""
    return price * quantity  # Floating point errors!

# Example of float precision errors:
# 0.1 + 0.2 = 0.30000000000000004 (not 0.3)
# 12.50 * 3 might not equal exactly 37.50 in float arithmetic
```

### Order Subtotal Calculation

```python
# ✅ CORRECT: Calculate order subtotal from line items
def calculate_order_subtotal(line_items: List[OrderLineItem]) -> Decimal:
    """
    Calculate order subtotal (sum of all line item subtotals)

    Args:
        line_items: List of order line items with price and quantity

    Returns:
        Order subtotal rounded to 2 decimal places
    """
    if not line_items:
        return Decimal("0.00")

    subtotal = Decimal("0.00")

    for item in line_items:
        # Each line item has already rounded subtotal
        subtotal += item.subtotal

    # Round final subtotal (should already be rounded, but be explicit)
    return subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

### Tax Calculation

```python
# ✅ CORRECT: Tax calculation with proper rounding
def calculate_tax(subtotal: Decimal, tax_rate: Decimal) -> Decimal:
    """
    Calculate sales tax

    Args:
        subtotal: Order subtotal
        tax_rate: Tax rate as decimal (e.g., 0.10 for 10%)

    Returns:
        Tax amount rounded to 2 decimal places

    Example:
        subtotal = Decimal("100.00")
        tax_rate = Decimal("0.10")  # 10%
        tax = Decimal("10.00")
    """
    if tax_rate < 0 or tax_rate > 1:
        raise ValueError("Tax rate must be between 0 and 1")

    tax = subtotal * tax_rate

    # Round to 2 decimal places
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


# Configuration: Tax rate stored as environment variable
TAX_RATE = Decimal(os.getenv("TAX_RATE", "0.10"))  # Default 10%
```

### Total Calculation

```python
# ✅ CORRECT: Calculate order total
def calculate_order_total(subtotal: Decimal, tax: Decimal) -> Decimal:
    """
    Calculate order total

    Args:
        subtotal: Order subtotal
        tax: Tax amount

    Returns:
        Total amount rounded to 2 decimal places
    """
    total = subtotal + tax

    # Round to 2 decimal places
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

## 2. Backend-Only Totals

The frontend NEVER calculates money. It displays what the backend calculated.

### Backend: Order Creation with Calculations

```python
# ✅ CORRECT: Backend calculates all amounts
# backend/src/api/routes/orders.py
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlmodel import Session

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order_data: CreateOrderDTO,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    menu_service: Annotated[MenuService, Depends(get_menu_service)]
):
    """
    Create order with backend-calculated totals

    Backend responsibilities:
    1. Fetch current menu prices from Sanity
    2. Calculate line item subtotals (price × quantity)
    3. Calculate order subtotal (sum of line items)
    4. Calculate tax (subtotal × tax rate)
    5. Calculate total (subtotal + tax)
    6. Store all calculated amounts in database
    """
    # Fetch menu items from Sanity (current prices)
    sanity_items = await menu_service.get_items_by_ids(
        [item.item_id for item in order_data.items]
    )
    sanity_items_map = {item["_id"]: item for item in sanity_items}

    # Create order (status: draft)
    order = Order(
        customer_id=order_data.customer_id,
        status="draft",
        delivery_date=order_data.delivery_date,
        notes=order_data.notes,
        created_by=current_user.id
    )

    session.add(order)
    session.flush()  # Get order.id

    # Calculate line items
    line_items = []
    subtotal = Decimal("0.00")

    for item_data in order_data.items:
        sanity_item = sanity_items_map[item_data.item_id]

        # Price snapshot from Sanity
        price = Decimal(str(sanity_item["price"]))
        quantity = item_data.quantity

        # Calculate line item subtotal (BACKEND)
        line_subtotal = calculate_line_item_subtotal(price, quantity)

        line_item = OrderLineItem(
            order_id=order.id,
            item_id=item_data.item_id,
            item_name=sanity_item["name"],
            quantity=quantity,
            price_at_order=price,
            subtotal=line_subtotal  # CALCULATED ON BACKEND
        )

        line_items.append(line_item)
        subtotal += line_subtotal

    # Calculate tax (BACKEND)
    tax = calculate_tax(subtotal, TAX_RATE)

    # Calculate total (BACKEND)
    total = calculate_order_total(subtotal, tax)

    # Store calculated amounts in order
    order.subtotal = subtotal
    order.tax = tax
    order.total = total

    # Save to database
    session.add_all(line_items)
    session.commit()
    session.refresh(order)

    return order


# ❌ WRONG: Trusting frontend calculations
@router.post("/orders-insecure")
async def create_order_insecure(order_data: CreateOrderDTOWithTotals):
    """INSECURE: Never trust frontend calculations"""
    # Frontend sends calculated totals - DON'T TRUST THEM!
    order = Order(
        subtotal=order_data.subtotal,  # ❌ From frontend
        tax=order_data.tax,            # ❌ From frontend
        total=order_data.total,        # ❌ From frontend
    )
    # Attacker could send: subtotal=1000, total=1 to get huge discount!
```

### Frontend: Display Backend Calculations

```typescript
// ✅ CORRECT: Frontend displays backend calculations
// components/OrderSummary.tsx
"use client";

export function OrderSummary({ order }: { order: Order }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        {/* Display backend-calculated subtotal */}
        <span>${order.subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between">
        <span>Tax (10%):</span>
        {/* Display backend-calculated tax */}
        <span>${order.tax.toFixed(2)}</span>
      </div>

      <div className="flex justify-between font-bold text-lg">
        <span>Total:</span>
        {/* Display backend-calculated total */}
        <span>${order.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ❌ WRONG: Frontend calculating money
function OrderSummaryWrong({ order }: { order: Order }) {
  // Never calculate money on frontend
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ); // ❌ Float arithmetic!

  const tax = subtotal * 0.10; // ❌ Frontend calculation!
  const total = subtotal + tax; // ❌ Frontend calculation!

  return <div>{total.toFixed(2)}</div>;
}
```

### Frontend: Estimate for UX (Optional)

```typescript
// ⚠️ ACCEPTABLE: Frontend estimates for UX (clearly marked)
// components/OrderFormEstimate.tsx
"use client";

import { useState, useEffect } from "react";

export function OrderFormEstimate({ items }: { items: OrderItem[] }) {
  const [estimate, setEstimate] = useState<number | null>(null);

  useEffect(() => {
    // Calculate ESTIMATE only (not authoritative)
    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.price) * item.quantity;
    }, 0);

    const tax = subtotal * 0.10;
    const total = subtotal + tax;

    setEstimate(total);
  }, [items]);

  return (
    <div className="text-sm text-gray-500 italic">
      {/* CLEARLY MARK AS ESTIMATE */}
      Estimated total: ${estimate?.toFixed(2) ?? "—"}
      <span className="block text-xs">
        (Final total calculated on submission)
      </span>
    </div>
  );
}

// Only for UX preview during form filling
// Backend recalculates everything on submit
```

## 3. Advance and Remaining Logic

Handle partial payments (deposits/advances) and balance due.

### Advance Payment Calculation

```python
# ✅ CORRECT: Advance payment and remaining balance
# backend/src/models/order.py
from sqlmodel import SQLModel, Field
from decimal import Decimal
from typing import Optional

class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customers.id")
    status: str  # draft, confirmed, billed, paid, completed

    # Calculated amounts (backend only)
    subtotal: Decimal = Field(max_digits=10, decimal_places=2)
    tax: Decimal = Field(max_digits=10, decimal_places=2)
    total: Decimal = Field(max_digits=10, decimal_places=2)

    # Payment tracking
    advance_paid: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=10,
        decimal_places=2,
        description="Advance/deposit paid"
    )

    # Remaining balance (calculated property)
    @property
    def remaining_balance(self) -> Decimal:
        """Calculate remaining balance due"""
        balance = self.total - self.advance_paid

        # Ensure non-negative
        if balance < Decimal("0.00"):
            return Decimal("0.00")

        return balance.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)

    @property
    def is_fully_paid(self) -> bool:
        """Check if order is fully paid"""
        return self.advance_paid >= self.total
```

### Record Advance Payment

```python
# ✅ CORRECT: Record advance payment
# backend/src/api/routes/orders.py

@router.post("/orders/{order_id}/payments")
async def record_payment(
    order_id: int,
    payment_data: RecordPaymentDTO,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Record advance payment for order

    Validates:
    1. Payment amount is positive
    2. Payment doesn't exceed order total
    3. Order is in valid state for payment
    """
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Validate payment amount
    payment_amount = payment_data.amount

    if payment_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be positive"
        )

    # Calculate new total advance
    new_advance_total = order.advance_paid + payment_amount

    # Check if payment exceeds order total
    if new_advance_total > order.total:
        raise HTTPException(
            status_code=400,
            detail=f"Payment would exceed order total. "
                   f"Remaining balance: ${order.remaining_balance}"
        )

    # Update advance paid
    order.advance_paid = new_advance_total

    # Update status if fully paid
    if order.is_fully_paid and order.status == "billed":
        order.status = "paid"

    # Create payment record (for audit trail)
    payment = Payment(
        order_id=order.id,
        amount=payment_amount,
        payment_method=payment_data.payment_method,
        payment_date=datetime.utcnow(),
        recorded_by=current_user.id,
        notes=payment_data.notes
    )

    session.add(payment)
    session.add(order)
    session.commit()
    session.refresh(order)

    return {
        "order_id": order.id,
        "payment_amount": payment_amount,
        "total_paid": order.advance_paid,
        "remaining_balance": order.remaining_balance,
        "is_fully_paid": order.is_fully_paid
    }
```

### Payment Model for Audit Trail

```python
# ✅ CORRECT: Payment record model
# backend/src/models/payment.py

class Payment(SQLModel, table=True):
    """Payment record for audit trail"""
    __tablename__ = "payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)

    amount: Decimal = Field(
        max_digits=10,
        decimal_places=2,
        description="Payment amount"
    )

    payment_method: str = Field(max_length=50)  # cash, check, card, transfer
    payment_date: datetime
    recorded_by: int = Field(foreign_key="users.id")

    notes: Optional[str] = Field(max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    order: Order = Relationship(back_populates="payments")
```

### Frontend: Display Payment Status

```typescript
// ✅ CORRECT: Display payment information
// components/OrderPaymentStatus.tsx

export function OrderPaymentStatus({ order }: { order: Order }) {
  const percentagePaid = (order.advance_paid / order.total) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span>Order Total:</span>
        <span className="font-semibold">${order.total.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-green-600">
        <span>Paid (Advance):</span>
        <span className="font-semibold">${order.advance_paid.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-red-600">
        <span>Remaining Balance:</span>
        <span className="font-semibold">
          ${order.remaining_balance.toFixed(2)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{percentagePaid.toFixed(0)}% paid</span>
          {order.is_fully_paid && (
            <span className="text-green-600 font-medium">✓ Fully Paid</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{ width: `${percentagePaid}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

## 4. Rounding Safety

Use proper rounding to avoid accumulation errors.

### Banker's Rounding (ROUND_HALF_EVEN)

```python
# ✅ CORRECT: Use banker's rounding
from decimal import Decimal, ROUND_HALF_EVEN

# Banker's rounding (round half to even)
# 2.5 → 2 (even)
# 3.5 → 4 (even)
# This minimizes accumulated rounding errors

def round_money(amount: Decimal) -> Decimal:
    """
    Round amount to 2 decimal places using banker's rounding

    Banker's rounding (ROUND_HALF_EVEN):
    - Minimizes bias in repeated rounding
    - Required by many accounting standards
    - Python's Decimal default
    """
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)


# Examples
assert round_money(Decimal("12.345")) == Decimal("12.34")
assert round_money(Decimal("12.355")) == Decimal("12.36")
assert round_money(Decimal("12.365")) == Decimal("12.36")  # Round to even
assert round_money(Decimal("12.375")) == Decimal("12.38")  # Round to even

# ❌ WRONG: Using round() on floats
def round_money_wrong(amount: float) -> float:
    return round(amount, 2)  # Inconsistent rounding with floats!
```

### Validation: Verify Calculations

```python
# ✅ CORRECT: Validate calculations match expected
def validate_order_calculations(order: Order) -> None:
    """
    Validate order calculations are correct

    Raises:
        ValueError: If calculations don't match
    """
    # Recalculate from line items
    expected_subtotal = Decimal("0.00")
    for item in order.line_items:
        expected_line_subtotal = calculate_line_item_subtotal(
            item.price_at_order,
            item.quantity
        )
        if item.subtotal != expected_line_subtotal:
            raise ValueError(
                f"Line item {item.id} subtotal mismatch: "
                f"stored={item.subtotal}, expected={expected_line_subtotal}"
            )
        expected_subtotal += item.subtotal

    # Validate subtotal
    if order.subtotal != expected_subtotal:
        raise ValueError(
            f"Order subtotal mismatch: "
            f"stored={order.subtotal}, expected={expected_subtotal}"
        )

    # Validate tax
    expected_tax = calculate_tax(order.subtotal, TAX_RATE)
    if order.tax != expected_tax:
        raise ValueError(
            f"Order tax mismatch: "
            f"stored={order.tax}, expected={expected_tax}"
        )

    # Validate total
    expected_total = calculate_order_total(order.subtotal, order.tax)
    if order.total != expected_total:
        raise ValueError(
            f"Order total mismatch: "
            f"stored={order.total}, expected={expected_total}"
        )
```

### Handling Currency Display

```python
# ✅ CORRECT: Format currency for display
def format_currency(amount: Decimal, currency: str = "USD") -> str:
    """
    Format Decimal amount as currency string

    Args:
        amount: Amount to format
        currency: Currency code (default: USD)

    Returns:
        Formatted string (e.g., "$12.50")
    """
    # Round to 2 decimal places
    rounded = round_money(amount)

    if currency == "USD":
        return f"${rounded:.2f}"
    elif currency == "EUR":
        return f"€{rounded:.2f}"
    else:
        return f"{rounded:.2f} {currency}"


# Usage
total = Decimal("123.456")
display = format_currency(total)  # "$123.46"
```

## Best Practices Checklist

- [ ] **Decimal Type**: Use `Decimal` for all money calculations, never `float`
- [ ] **Backend Calculations**: All calculations happen on backend
- [ ] **Frontend Display Only**: Frontend displays backend results, doesn't calculate
- [ ] **Explicit Rounding**: Round with `quantize()` and `ROUND_HALF_EVEN`
- [ ] **Two Decimal Places**: All money amounts rounded to 2 decimal places
- [ ] **Price Snapshots**: Line items store `price_at_order` (snapshot)
- [ ] **Validation**: Verify calculations match expected totals
- [ ] **Advance Tracking**: Track `advance_paid` and calculate `remaining_balance`
- [ ] **Payment Audit**: Store payment records for audit trail
- [ ] **Non-Negative**: Ensure remaining balance doesn't go negative
- [ ] **Tax Calculation**: Tax calculated from subtotal × tax_rate
- [ ] **Environment Config**: Tax rate stored in environment variables

## Common Pitfalls

### Pitfall 1: Float Precision Errors

```python
# ❌ WRONG: Float arithmetic for money
price = 12.50
quantity = 3
subtotal = price * quantity  # Might be 37.49999999999999

# ✅ CORRECT: Decimal arithmetic
price = Decimal("12.50")
quantity = 3
subtotal = price * Decimal(str(quantity))  # Exactly 37.50
```

### Pitfall 2: Frontend Calculations

```typescript
// ❌ WRONG: Frontend calculating totals
const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

// ✅ CORRECT: Backend calculates, frontend displays
<span>${order.total.toFixed(2)}</span>
```

### Pitfall 3: Incorrect Rounding

```python
# ❌ WRONG: Rounding each operation
subtotal = Decimal("10.00")
tax = (subtotal * Decimal("0.10")).quantize(Decimal("0.01"))
shipping = Decimal("5.00")
total = (subtotal + tax + shipping).quantize(Decimal("0.01"))  # Round at end

# ✅ CORRECT: Round intermediates, verify final
subtotal = round_money(Decimal("10.00"))
tax = round_money(subtotal * Decimal("0.10"))
shipping = round_money(Decimal("5.00"))
total = round_money(subtotal + tax + shipping)  # Double-check rounding
```

### Pitfall 4: Trusting Frontend

```python
# ❌ WRONG: Using frontend-provided totals
@router.post("/orders")
async def create_order(order_data: OrderDTO):
    order = Order(
        subtotal=order_data.subtotal,  # ❌ From frontend - don't trust!
        total=order_data.total          # ❌ Attacker could modify
    )

# ✅ CORRECT: Calculate on backend
@router.post("/orders")
async def create_order(order_data: OrderDTO):
    subtotal = calculate_order_subtotal(order_data.items)  # ✅ Backend calc
    tax = calculate_tax(subtotal, TAX_RATE)
    total = calculate_order_total(subtotal, tax)
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Data integrity principles)
- System Architecture: `.claude/skills/system-architecture.md` (Backend responsibilities)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Service layer)
- Sanity CMS: `.claude/skills/sanity-io-cms.md` (Price snapshots)

---

**Remember**: Money calculations are security-critical. Use Decimal, calculate on backend, validate results, and never trust frontend calculations. Incorrect money handling damages customer trust and creates legal/accounting issues.
