---
id: 012
title: Create Order Calculation Logic Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "calculations", "financial", "decimal", "backend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/order-calculation-logic.md
tests:
  - None
---

## Prompt

Create a skill named "Order Calculation Logic".

Includes:
- Rate × quantity calculations
- Backend-only totals
- Advance and remaining logic
- Rounding safety

Create at:
.claude/skills/order-calculation-logic.md

## Response snapshot

Created mandatory Order Calculation Logic skill at `.claude/skills/order-calculation-logic.md`.

The skill defines financial calculation patterns for KN KITCHEN:

**Core Principles:**
1. Backend-Only Calculations - All money calculations happen on server
2. Decimal Precision - Use `Decimal` type, never floats for money
3. Explicit Rounding - Round explicitly with banker's rounding
4. Validation - Verify calculations match expected totals
5. Audit Trail - Log all calculation steps for debugging

**1. Rate × Quantity Calculations:**

**Line Item Subtotal:**
```python
from decimal import Decimal, ROUND_HALF_EVEN

def calculate_line_item_subtotal(price: Decimal, quantity: int) -> Decimal:
    subtotal = price * Decimal(str(quantity))
    return subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

**Order Subtotal:**
- Sum all line item subtotals
- Each line item already rounded
- Round final sum to 2 decimal places

**Tax Calculation:**
```python
def calculate_tax(subtotal: Decimal, tax_rate: Decimal) -> Decimal:
    tax = subtotal * tax_rate
    return tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

**Total Calculation:**
```python
def calculate_order_total(subtotal: Decimal, tax: Decimal) -> Decimal:
    total = subtotal + tax
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

**Why Decimal Not Float:**
- Float: `0.1 + 0.2 = 0.30000000000000004`
- Decimal: `Decimal("0.1") + Decimal("0.2") = Decimal("0.3")`
- Money requires exact precision

**2. Backend-Only Totals:**

**Backend Responsibilities:**
1. Fetch current menu prices from Sanity
2. Calculate line item subtotals (price × quantity)
3. Calculate order subtotal (sum of line items)
4. Calculate tax (subtotal × tax rate)
5. Calculate total (subtotal + tax)
6. Store all calculated amounts in database

**Frontend Responsibilities:**
- Display backend-calculated amounts
- NEVER calculate money
- Optional: Show estimates (clearly marked) for UX during form filling

**Critical Rule:**
```python
# ❌ WRONG: Trusting frontend totals
order = Order(
    total=order_data.total  # From frontend - NEVER TRUST
)

# ✅ CORRECT: Backend calculates
total = calculate_order_total(subtotal, tax)
order.total = total
```

**Security:**
- Attacker could send `total=1` for $1000 order if frontend-calculated
- Backend MUST recalculate everything

**3. Advance and Remaining Logic:**

**Order Model:**
```python
class Order:
    total: Decimal               # Order total
    advance_paid: Decimal = 0.00 # Deposit/advance paid

    @property
    def remaining_balance(self) -> Decimal:
        balance = self.total - self.advance_paid
        return max(balance, Decimal("0.00"))  # Non-negative

    @property
    def is_fully_paid(self) -> bool:
        return self.advance_paid >= self.total
```

**Record Payment:**
```python
@router.post("/orders/{id}/payments")
async def record_payment(order_id, payment_amount):
    # Validate payment amount > 0
    # Validate payment doesn't exceed remaining balance
    order.advance_paid += payment_amount
    # Update status if fully paid
    if order.is_fully_paid:
        order.status = "paid"
```

**Payment Audit Trail:**
```python
class Payment:
    order_id: int
    amount: Decimal
    payment_method: str  # cash, check, card, transfer
    payment_date: datetime
    recorded_by: int     # User who recorded payment
    notes: Optional[str]
```

**4. Rounding Safety:**

**Banker's Rounding (ROUND_HALF_EVEN):**
- 2.5 → 2 (round to even)
- 3.5 → 4 (round to even)
- Minimizes accumulated rounding errors
- Required by accounting standards

**Explicit Rounding:**
```python
def round_money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
```

**Validation:**
```python
def validate_order_calculations(order: Order):
    # Recalculate from line items
    expected_subtotal = sum(item.subtotal for item in order.line_items)
    assert order.subtotal == expected_subtotal

    # Validate tax
    expected_tax = calculate_tax(order.subtotal, TAX_RATE)
    assert order.tax == expected_tax

    # Validate total
    expected_total = order.subtotal + order.tax
    assert order.total == expected_total
```

**Currency Display:**
```python
def format_currency(amount: Decimal) -> str:
    rounded = round_money(amount)
    return f"${rounded:.2f}"
```

**Common Pitfalls:**

**Pitfall 1: Float Errors**
```python
# ❌ Float: 12.50 * 3 might not equal exactly 37.50
# ✅ Decimal: Exact precision
```

**Pitfall 2: Frontend Calculations**
```typescript
// ❌ Frontend calculating totals
// ✅ Frontend displaying backend totals
```

**Pitfall 3: Incorrect Rounding**
```python
# ✅ Round intermediates and final result
subtotal = round_money(price * quantity)
tax = round_money(subtotal * tax_rate)
total = round_money(subtotal + tax)
```

**Pitfall 4: Trusting Frontend**
```python
# ❌ Using frontend-provided totals
# ✅ Backend recalculates everything
```

**Best Practices Checklist:**
- [ ] Decimal type for all money (never float)
- [ ] Backend calculates, frontend displays
- [ ] Explicit rounding with ROUND_HALF_EVEN
- [ ] Two decimal places for all amounts
- [ ] Price snapshots in line items
- [ ] Validation of calculations
- [ ] Advance payment tracking
- [ ] Payment audit trail
- [ ] Non-negative remaining balance
- [ ] Tax from environment config
- [ ] Security: Never trust frontend totals

## Outcome

- ✅ Impact: Established critical financial calculation patterns ensuring data integrity, proper decimal precision, backend-only calculations, and security against frontend manipulation
- 🧪 Tests: None (calculation logic patterns)
- 📁 Files: Created .claude/skills/order-calculation-logic.md (558 lines)
- 🔁 Next prompts: Reference during order service implementation, validate calculation logic in code reviews
- 🧠 Reflection: Skill emphasizes security-critical principle that frontend NEVER calculates money, with comprehensive examples of proper Decimal usage, banker's rounding, and advance payment tracking

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during order creation implementation and financial calculation testing
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test Decimal precision and validation during first order creation with line items and tax calculation
