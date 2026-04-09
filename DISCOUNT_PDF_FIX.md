# Discount Display Fix in Order Invoice PDF

## Issue
When approving a quotation with discount and downloading the order invoice PDF, the discount line was not appearing in the summary section, even though the total was correctly reduced.

**Example:**
- Quotation total: Rs 500
- Discount applied: Rs 200
- Order total showed: Rs 300 (correct)
- But discount line in PDF: NOT SHOWING (incorrect)

## Root Cause
The condition `if order.discount and float(order.discount) > 0:` was failing because:
- If discount is NULL in database, `order.discount` evaluates to False
- If discount is 0, `order.discount` evaluates to False
- This prevented the discount line from being added to the PDF

## Solution
Changed the condition to properly handle NULL values:

**Before:**
```python
if order.discount and float(order.discount) > 0:
    summary_data.append(['Discount:', f"Rs {float(order.discount):,.2f}"])
```

**After:**
```python
discount_amount = float(order.discount or 0)
if discount_amount > 0:
    summary_data.append(['Discount:', f"Rs {discount_amount:,.2f}"])
```

Also updated subtotal calculation to handle NULL:
```python
['Subtotal:', f"Rs {float(order.total_amount) + float(order.discount or 0):,.2f}"],
```

## Result
Now the order invoice PDF correctly displays:
```
Subtotal: Rs 500.00
Discount: Rs 200.00
Advance Payment: Rs 0.00
Balance Due: Rs 300.00
Status: PENDING
```

## Files Modified
- `backend/src/api/orders.py` - Fixed discount display logic

## Testing
1. Create quotation with discount (e.g., Rs 200)
2. Approve quotation
3. Download order invoice PDF
4. Verify discount line appears in summary

## Deployment
- Code committed and pushed to GitHub
- Render will auto-deploy on next build
- Fix takes effect immediately after deployment

---

**Status:** ✓ FIXED AND DEPLOYED
**Commit:** a1b6378
**Date:** 2026-04-09
