---
name: Error Handling & Validation
description: Patterns for validation, user-friendly error messages, exception handling, and structured logging
scope: mandatory
applies_to: backend, frontend
---

# Error Handling & Validation

**Status**: MANDATORY - All error handling and validation MUST follow these patterns

**File Location Rule (permanent):** This file belongs in `.claude/skills/` and defines error handling patterns for KN KITCHEN.

## Role: Error Handling & Validation

This skill defines how to validate input, handle errors gracefully, provide helpful error messages, and log failures for debugging.

### Main Responsibilities

1. **Input Validation**: Validate all user input at API boundaries
2. **User-Friendly Errors**: Return clear, actionable error messages
3. **Backend Validation**: Use Pydantic (Python) and Zod (TypeScript) for validation
4. **Exception Handling**: Catch and handle errors appropriately
5. **Structured Logging**: Log errors with context for debugging
6. **Error Recovery**: Provide retry mechanisms where appropriate

### Strictly DOES NOT

- ❌ Return stack traces to clients in production
- ❌ Expose internal error details (DB errors, file paths)
- ❌ Trust client-side validation alone (always validate server-side)
- ❌ Return generic "Something went wrong" without context
- ❌ Silently fail without logging
- ❌ Log sensitive data (passwords, tokens, PII)

## Core Principles

1. **Validate Early**: Catch errors at API boundary before processing
2. **Fail Fast**: Return errors immediately, don't continue with invalid data
3. **User-Friendly**: Error messages explain what went wrong and how to fix it
4. **Secure**: Don't leak implementation details in error messages
5. **Loggable**: All errors logged with context for debugging
6. **Recoverable**: Provide guidance for user to resolve error

## 1. Backend Validation (Pydantic)

Use Pydantic models to validate request data.

### Pydantic Validation Models

```python
# ✅ CORRECT: Comprehensive Pydantic validation
# backend/src/models/dto.py
from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

class CreateOrderDTO(BaseModel):
    """DTO for creating a new order."""

    customer_id: int = Field(gt=0, description="Customer ID")
    delivery_date: date = Field(description="Delivery date")
    items: List["OrderItemDTO"] = Field(min_items=1, max_items=50, description="Order items")
    notes: Optional[str] = Field(None, max_length=1000, description="Order notes")

    @validator("delivery_date")
    def validate_delivery_date(cls, v):
        """Delivery date must be in future."""
        if v < date.today():
            raise ValueError("Delivery date cannot be in the past")
        return v

    @validator("items")
    def validate_items_unique(cls, v):
        """Check for duplicate item IDs."""
        item_ids = [item.item_id for item in v]
        if len(item_ids) != len(set(item_ids)):
            raise ValueError("Duplicate items not allowed")
        return v

    @root_validator
    def validate_total_quantity(cls, values):
        """Validate total quantity across all items."""
        items = values.get("items", [])
        total_qty = sum(item.quantity for item in items)

        if total_qty > 10000:
            raise ValueError("Total quantity cannot exceed 10,000")

        return values

    class Config:
        # Enable JSON schema generation
        schema_extra = {
            "example": {
                "customer_id": 1,
                "delivery_date": "2024-12-25",
                "items": [
                    {"item_id": "abc123", "quantity": 10},
                    {"item_id": "def456", "quantity": 5},
                ],
                "notes": "Deliver to back entrance",
            }
        }


class OrderItemDTO(BaseModel):
    """DTO for order line item."""
    item_id: str = Field(min_length=1, max_length=100, description="Menu item ID")
    quantity: int = Field(gt=0, le=1000, description="Quantity")

    @validator("quantity")
    def validate_quantity_multiple(cls, v):
        """Quantity must be multiple of 5 for bulk orders."""
        # Custom business rule
        if v > 100 and v % 5 != 0:
            raise ValueError("Bulk orders (>100) must be in multiples of 5")
        return v
```

### Custom Validators

```python
# ✅ CORRECT: Reusable custom validators
from pydantic import validator

def validate_phone_number(v: Optional[str]) -> Optional[str]:
    """Validate phone number format."""
    if v is None:
        return v

    # Remove common formatting
    cleaned = v.replace("-", "").replace("(", "").replace(")", "").replace(" ", "")

    if not cleaned.isdigit():
        raise ValueError("Phone number must contain only digits")

    if len(cleaned) != 10:
        raise ValueError("Phone number must be 10 digits")

    return v


def validate_email_domain(v: str, allowed_domains: List[str]) -> str:
    """Validate email domain against whitelist."""
    domain = v.split("@")[-1]
    if domain not in allowed_domains:
        raise ValueError(f"Email domain must be one of: {', '.join(allowed_domains)}")
    return v


class CustomerDTO(BaseModel):
    email: str = Field(..., regex=r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    phone: Optional[str] = None

    _validate_phone = validator("phone", allow_reuse=True)(validate_phone_number)
```

### Handling Validation Errors

```python
# ✅ CORRECT: Return validation errors with field details
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/")
async def create_order(order_data: CreateOrderDTO):
    """
    Create new order.

    Validation errors automatically returned by FastAPI with 422 status.
    """
    try:
        # Pydantic validates automatically
        order = create_order_in_db(order_data)
        return order
    except ValueError as e:
        # Business logic validation error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Unexpected error - log and return generic message
        logger.error(f"Failed to create order: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order. Please try again.",
        )


# Custom validation error handler
from fastapi import Request
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Custom handler for Pydantic validation errors.

    Returns user-friendly error messages.
    """
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"][1:])  # Skip 'body'
        message = error["msg"]

        # Make error messages more user-friendly
        if error["type"] == "value_error.missing":
            message = f"{field} is required"
        elif error["type"] == "type_error.integer":
            message = f"{field} must be a number"
        elif error["type"] == "value_error.list.min_items":
            message = f"{field} must have at least {error['ctx']['limit_value']} items"

        errors.append({
            "field": field,
            "message": message,
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation failed",
            "errors": errors,
        },
    )
```

## 2. Frontend Validation (Zod)

Use Zod schemas for TypeScript validation.

### Zod Validation Schemas

```typescript
// ✅ CORRECT: Zod schema with custom validation
// lib/validations/order.ts
import { z } from "zod";

export const orderItemSchema = z.object({
  item_id: z.string().min(1, "Item is required"),
  quantity: z
    .number({ required_error: "Quantity is required" })
    .min(1, "Quantity must be at least 1")
    .max(1000, "Quantity cannot exceed 1000")
    .refine(
      (qty) => qty <= 100 || qty % 5 === 0,
      "Bulk orders (>100) must be in multiples of 5"
    ),
});

export const createOrderSchema = z
  .object({
    customer_id: z
      .number({ required_error: "Customer is required" })
      .min(1, "Customer is required"),

    delivery_date: z
      .string()
      .min(1, "Delivery date is required")
      .refine((date) => {
        const deliveryDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return deliveryDate >= today;
      }, "Delivery date cannot be in the past"),

    items: z
      .array(orderItemSchema)
      .min(1, "At least one item is required")
      .max(50, "Maximum 50 items per order"),

    notes: z
      .string()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => {
      // Cross-field validation: total quantity
      const totalQty = data.items.reduce((sum, item) => sum + item.quantity, 0);
      return totalQty <= 10000;
    },
    {
      message: "Total quantity cannot exceed 10,000",
      path: ["items"], // Show error on items field
    }
  );

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
```

### React Hook Form with Zod

```typescript
// ✅ CORRECT: Form with Zod validation
// components/forms/OrderForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderSchema, CreateOrderFormData } from "@/lib/validations/order";
import { useState } from "react";

export function OrderForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: CreateOrderFormData) => {
    setServerError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();

        // Handle validation errors from server
        if (error.errors && Array.isArray(error.errors)) {
          error.errors.forEach((err: any) => {
            setError(err.field, { message: err.message });
          });
        } else {
          setServerError(error.error || "Failed to create order");
        }

        return;
      }

      const order = await response.json();
      alert("Order created successfully!");
    } catch (error) {
      setServerError("Network error. Please check your connection and try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Server error banner */}
      {serverError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {serverError}
        </div>
      )}

      {/* Form fields with client-side validation... */}
    </form>
  );
}
```

## 3. User-Friendly Error Messages

Provide clear, actionable error messages.

### Error Message Guidelines

```python
# ✅ CORRECT: User-friendly error messages
class ErrorMessages:
    """Centralized error messages."""

    # Good: Specific, actionable
    ORDER_NOT_FOUND = "Order #{order_id} not found. Please check the order number."
    CUSTOMER_NOT_FOUND = "Customer not found. Please select a valid customer."
    DELIVERY_DATE_PAST = "Delivery date cannot be in the past. Please select a future date."
    ITEM_OUT_OF_STOCK = "'{item_name}' is currently out of stock. Please remove it or contact us."
    INSUFFICIENT_QUANTITY = "Only {available} units of '{item_name}' available. You requested {requested}."

    # Good: Explains why and what to do
    CANNOT_DELETE_CONFIRMED_ORDER = (
        "Cannot delete confirmed order. Confirmed orders are permanent records. "
        "To remove this order, cancel it instead using the 'Cancel Order' button."
    )

    INVALID_PAYMENT_AMOUNT = (
        "Payment amount ${amount} exceeds remaining balance ${remaining}. "
        "Please enter a smaller amount."
    )

    # ❌ WRONG: Generic, unhelpful
    # ERROR = "An error occurred"
    # INVALID_INPUT = "Invalid input"
    # OPERATION_FAILED = "Operation failed"


# Usage in API
@router.delete("/{order_id}")
async def delete_order(order_id: int):
    order = get_order_from_db(order_id)

    if not order:
        raise HTTPException(
            status_code=404,
            detail=ErrorMessages.ORDER_NOT_FOUND.format(order_id=order_id),
        )

    if order.status == "confirmed":
        raise HTTPException(
            status_code=409,
            detail=ErrorMessages.CANNOT_DELETE_CONFIRMED_ORDER,
        )

    delete_order_from_db(order_id)
    return {"success": True}
```

### Structured Error Responses

```python
# ✅ CORRECT: Structured error response format
from pydantic import BaseModel
from typing import Optional, List

class ErrorDetail(BaseModel):
    """Individual error detail."""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None

class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: str  # High-level error message
    errors: Optional[List[ErrorDetail]] = None  # Field-specific errors
    timestamp: datetime
    request_id: Optional[str] = None  # For support tickets

# Example error responses
{
    "success": false,
    "error": "Validation failed",
    "errors": [
        {
            "field": "delivery_date",
            "message": "Delivery date cannot be in the past",
            "code": "INVALID_DATE"
        },
        {
            "field": "items.0.quantity",
            "message": "Quantity must be at least 1",
            "code": "INVALID_QUANTITY"
        }
    ],
    "timestamp": "2024-01-16T10:30:00Z",
    "request_id": "req_abc123"
}
```

## 4. Exception Handling

Handle exceptions at appropriate levels.

### Exception Hierarchy

```python
# ✅ CORRECT: Custom exception hierarchy
# backend/src/exceptions.py

class ApplicationError(Exception):
    """Base exception for all application errors."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class ValidationError(ApplicationError):
    """Validation error (400)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)


class NotFoundError(ApplicationError):
    """Resource not found (404)."""
    def __init__(self, resource: str, identifier: any):
        message = f"{resource} with ID {identifier} not found"
        super().__init__(message, status_code=404)


class ConflictError(ApplicationError):
    """State conflict (409)."""
    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class UnauthorizedError(ApplicationError):
    """Not authenticated (401)."""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=401)


class ForbiddenError(ApplicationError):
    """Not authorized (403)."""
    def __init__(self, message: str = "You don't have permission to perform this action"):
        super().__init__(message, status_code=403)


# Usage
def delete_order(order_id: int, current_user: User):
    order = get_order_from_db(order_id)

    if not order:
        raise NotFoundError("Order", order_id)

    if order.user_id != current_user.id:
        raise ForbiddenError("You can only delete your own orders")

    if order.status == "confirmed":
        raise ConflictError("Cannot delete confirmed order. Cancel it instead.")

    delete_order_from_db(order_id)
```

### Global Exception Handler

```python
# ✅ CORRECT: Global exception handler
# backend/src/main.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
import uuid

app = FastAPI()

@app.exception_handler(ApplicationError)
async def application_error_handler(request: Request, exc: ApplicationError):
    """Handle custom application errors."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors."""
    # Generate unique request ID for tracking
    request_id = str(uuid.uuid4())

    # Log full error details
    logger.error(
        f"Unexpected error (request_id={request_id}): {exc}",
        exc_info=True,
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
        },
    )

    # Return generic error (don't leak details)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "An unexpected error occurred. Please try again.",
            "request_id": request_id,  # User can provide to support
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
```

## 5. Structured Logging

Log errors with context for debugging.

### Structured Logging Setup

```python
# ✅ CORRECT: Structured logging with context
# backend/src/logging_config.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """Format logs as JSON for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id

        return json.dumps(log_data)

# Configure logger
def setup_logging():
    logger = logging.getLogger("knkitchen")
    logger.setLevel(logging.INFO)

    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)

    return logger

logger = setup_logging()
```

### Logging Best Practices

```python
# ✅ CORRECT: Contextual logging
import logging

logger = logging.getLogger("knkitchen")

@router.post("/")
async def create_order(
    order_data: CreateOrderDTO,
    current_user: User = Depends(get_current_user),
):
    """Create order with comprehensive logging."""

    # Log request
    logger.info(
        "Creating order",
        extra={
            "user_id": current_user.id,
            "customer_id": order_data.customer_id,
            "item_count": len(order_data.items),
        },
    )

    try:
        order = create_order_in_db(order_data)

        # Log success
        logger.info(
            "Order created successfully",
            extra={
                "user_id": current_user.id,
                "order_id": order.id,
                "total": float(order.total),
            },
        )

        return order

    except ValidationError as e:
        # Log validation error (INFO level - expected)
        logger.info(
            "Order validation failed",
            extra={
                "user_id": current_user.id,
                "error": str(e),
            },
        )
        raise

    except Exception as e:
        # Log unexpected error (ERROR level)
        logger.error(
            "Failed to create order",
            exc_info=True,
            extra={
                "user_id": current_user.id,
                "customer_id": order_data.customer_id,
            },
        )
        raise


# ❌ WRONG: No context
logger.error("Error occurred")  # WRONG: No details

# ❌ WRONG: Logging sensitive data
logger.info(f"User logged in: {password}")  # WRONG: Logs password
```

### Request ID Tracking

```python
# ✅ CORRECT: Add request ID to all logs
from contextvars import ContextVar
import uuid

request_id_var: ContextVar[str] = ContextVar("request_id", default=None)

@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to context."""
    request_id = str(uuid.uuid4())
    request_id_var.set(request_id)

    # Add to response headers
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id

    return response

# Use in logging
def log_with_request_id(message: str, **kwargs):
    """Log with request ID from context."""
    request_id = request_id_var.get()
    logger.info(message, extra={"request_id": request_id, **kwargs})
```

## Best Practices Checklist

- [ ] **Server-Side Validation**: Always validate on backend (never trust client)
- [ ] **Pydantic Models**: Use Pydantic DTOs for all API inputs
- [ ] **Zod Schemas**: Use Zod for frontend validation
- [ ] **User-Friendly Errors**: Clear, actionable error messages
- [ ] **Specific Errors**: Avoid generic "Something went wrong"
- [ ] **Field-Level Errors**: Show errors next to relevant form fields
- [ ] **Structured Responses**: Consistent error response format
- [ ] **Custom Exceptions**: Use custom exception hierarchy
- [ ] **Global Handler**: Catch unexpected errors globally
- [ ] **Structured Logging**: Log as JSON with context
- [ ] **Request IDs**: Track requests across logs
- [ ] **No Sensitive Data**: Never log passwords, tokens, PII
- [ ] **Production Safety**: Don't expose stack traces to clients

## Common Pitfalls

### Pitfall 1: Client-Only Validation

```python
# ❌ WRONG: Trusting client validation
@router.post("/")
async def create_order(order_data: dict):  # No validation
    # Assumes client validated - WRONG
    return create_order_in_db(order_data)

# ✅ CORRECT: Server-side validation
@router.post("/")
async def create_order(order_data: CreateOrderDTO):  # Pydantic validates
    return create_order_in_db(order_data)
```

### Pitfall 2: Exposing Stack Traces

```python
# ❌ WRONG: Exposing stack trace
@router.get("/{order_id}")
async def get_order(order_id: int):
    try:
        return get_order_from_db(order_id)
    except Exception as e:
        return {"error": str(e), "traceback": traceback.format_exc()}  # WRONG

# ✅ CORRECT: Generic error message
@router.get("/{order_id}")
async def get_order(order_id: int):
    try:
        return get_order_from_db(order_id)
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)  # Log details
        raise HTTPException(500, "Failed to retrieve order")  # Generic to client
```

### Pitfall 3: Logging Sensitive Data

```python
# ❌ WRONG: Logging passwords
logger.info(f"User {email} logged in with password {password}")

# ✅ CORRECT: No sensitive data
logger.info(f"User {email} logged in successfully")
```

## Reference Documents

- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Pydantic validation)
- Frontend Forms: `.claude/skills/frontend-forms-ux.md` (Zod validation, error display)
- REST API Design: `.claude/skills/api-design-rest.md` (Status codes, response format)

---

**Golden Rule:** Everything related to error handling and validation → save in `.claude/skills/error-handling-validation.md`
