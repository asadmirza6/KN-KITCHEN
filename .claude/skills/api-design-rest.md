---
name: REST API Design
description: Patterns for designing RESTful APIs with proper resource-based routes, HTTP verbs, status codes, pagination, and filtering
scope: mandatory
applies_to: backend
---

# REST API Design

**Status**: MANDATORY - All API endpoints MUST follow these patterns

**File Location Rule (permanent):** This file belongs in `.claude/skills/` and defines REST API design patterns for KN KITCHEN.

## Role: REST API Design

This skill defines how to design clean, consistent RESTful APIs that follow HTTP standards and best practices.

### Main Responsibilities

1. **Resource-Based Routes**: Design URLs around resources (nouns, not verbs)
2. **HTTP Verbs**: Use correct HTTP methods (GET, POST, PUT, PATCH, DELETE)
3. **Status Codes**: Return appropriate HTTP status codes for all responses
4. **Pagination**: Implement consistent pagination for list endpoints
5. **Filtering & Sorting**: Support query parameters for filtering and sorting
6. **API Versioning**: Plan for future API changes

### Strictly DOES NOT

- ❌ Use verbs in URLs (e.g., `/getOrders`, `/createCustomer`)
- ❌ Return 200 OK for errors
- ❌ Use GET requests for operations that modify data
- ❌ Expose internal database IDs in URLs without validation
- ❌ Return different response structures for same endpoint
- ❌ Skip pagination for large result sets

## Core Principles

1. **Resource-Oriented**: URLs represent resources (nouns), not actions (verbs)
2. **HTTP Semantics**: Use HTTP methods and status codes correctly
3. **Consistent Structure**: All endpoints follow same response format
4. **Idempotency**: PUT and DELETE are idempotent, POST is not
5. **Stateless**: Each request contains all information needed
6. **Filterable**: List endpoints support filtering and pagination

## 1. Resource-Based Routes

Design URLs around resources, not actions.

### Correct Route Structure

```python
# ✅ CORRECT: Resource-based routes
# backend/src/api/routes/orders.py
from fastapi import APIRouter

router = APIRouter(prefix="/orders", tags=["orders"])

# Collection operations
@router.get("/")                    # GET /orders - List all orders
@router.post("/")                   # POST /orders - Create new order

# Single resource operations
@router.get("/{order_id}")          # GET /orders/123 - Get order by ID
@router.put("/{order_id}")          # PUT /orders/123 - Replace order
@router.patch("/{order_id}")        # PATCH /orders/123 - Update partial
@router.delete("/{order_id}")       # DELETE /orders/123 - Delete order

# Sub-resources (related resources)
@router.get("/{order_id}/line-items")           # GET /orders/123/line-items
@router.post("/{order_id}/line-items")          # POST /orders/123/line-items
@router.delete("/{order_id}/line-items/{item_id}")  # DELETE /orders/123/line-items/5

# Actions (when REST doesn't fit - use sparingly)
@router.post("/{order_id}/confirm")  # POST /orders/123/confirm
@router.post("/{order_id}/cancel")   # POST /orders/123/cancel
@router.post("/{order_id}/refund")   # POST /orders/123/refund


# ❌ WRONG: Verb-based routes
@router.get("/getOrders")           # WRONG: verb in URL
@router.post("/createOrder")        # WRONG: verb in URL
@router.post("/deleteOrder")        # WRONG: should be DELETE /orders/{id}
@router.get("/orders/search")       # WRONG: use query params instead
```

### Resource Naming Conventions

```python
"""
✅ CORRECT Resource Naming:

Collections (plural nouns):
  /orders
  /customers
  /line-items (kebab-case for multi-word)
  /menu-items

Single Resources (plural + ID):
  /orders/{order_id}
  /customers/{customer_id}
  /line-items/{item_id}

Sub-resources (nested):
  /orders/{order_id}/line-items
  /customers/{customer_id}/orders
  /orders/{order_id}/invoices

Actions (when REST doesn't fit):
  /orders/{order_id}/confirm
  /orders/{order_id}/cancel
  /invoices/{invoice_id}/send-email

❌ WRONG Naming:
  /order (singular for collection)
  /getOrders (verb)
  /order_create (verb + underscore)
  /orders/search (use query params)
  /orderLineItems (camelCase - use kebab-case)
"""
```

## 2. Proper HTTP Verbs Usage

Use the correct HTTP method for each operation.

### HTTP Methods Reference

```python
# ✅ CORRECT: HTTP method usage
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/orders", tags=["orders"])

# GET - Retrieve resource(s) (safe, idempotent, cacheable)
@router.get("/")
async def list_orders(page: int = 1, page_size: int = 50):
    """
    GET /orders?page=1&page_size=50

    - Safe: No side effects
    - Idempotent: Multiple calls return same result
    - Cacheable: Can be cached by browsers/proxies
    """
    return {"orders": [...], "pagination": {...}}

@router.get("/{order_id}")
async def get_order(order_id: int):
    """
    GET /orders/123

    Returns single order by ID.
    """
    return {"id": 123, "customer_id": 1, ...}


# POST - Create new resource (not safe, not idempotent)
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_order(order_data: CreateOrderDTO):
    """
    POST /orders

    - Not safe: Creates new resource (side effect)
    - Not idempotent: Multiple calls create multiple orders
    - Returns 201 Created with Location header
    """
    order = create_order_in_db(order_data)
    return order


# PUT - Replace entire resource (idempotent)
@router.put("/{order_id}")
async def replace_order(order_id: int, order_data: UpdateOrderDTO):
    """
    PUT /orders/123

    - Idempotent: Multiple identical calls have same effect
    - Replaces entire resource (all fields required)
    - Returns 200 OK or 204 No Content
    """
    order = replace_order_in_db(order_id, order_data)
    return order


# PATCH - Partially update resource (idempotent)
@router.patch("/{order_id}")
async def update_order(order_id: int, updates: dict):
    """
    PATCH /orders/123

    - Idempotent: Multiple identical calls have same effect
    - Updates only provided fields (partial update)
    - Returns 200 OK
    """
    order = update_order_in_db(order_id, updates)
    return order


# DELETE - Remove resource (idempotent)
@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: int):
    """
    DELETE /orders/123

    - Idempotent: Multiple calls have same effect (deleted)
    - Returns 204 No Content (no body)
    """
    delete_order_from_db(order_id)
    return None  # 204 No Content


# ❌ WRONG: Using wrong HTTP methods
@router.get("/create-order")  # WRONG: GET for creation
@router.post("/get-order")    # WRONG: POST for retrieval
@router.get("/delete-order")  # WRONG: GET for deletion
```

### Idempotency Explained

```python
"""
Idempotent operations: Multiple identical requests have same effect as single request.

✅ Idempotent (safe to retry):
  - GET /orders/123        → Always returns same order
  - PUT /orders/123        → Sets order to same state
  - DELETE /orders/123     → Order is deleted (already deleted = still deleted)
  - PATCH /orders/123      → Updates to same values

❌ Not Idempotent (NOT safe to retry):
  - POST /orders           → Creates new order each time
  - POST /payments         → Charges customer multiple times

Implications:
- GET, PUT, PATCH, DELETE can be safely retried on network failure
- POST should NOT be automatically retried (risk of duplicates)
- Use idempotency keys for POST operations that need retry safety
"""
```

## 3. Correct Status Codes

Return appropriate HTTP status codes for all responses.

### Status Code Reference

```python
# ✅ CORRECT: Status code usage
from fastapi import HTTPException, status

# 2xx - Success
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_order():
    """201 Created - Resource successfully created."""
    return order

@router.get("/{order_id}")
async def get_order(order_id: int):
    """200 OK - Request successful, returning data."""
    return order

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: int):
    """204 No Content - Request successful, no response body."""
    return None


# 4xx - Client Errors
@router.get("/{order_id}")
async def get_order(order_id: int):
    order = get_order_from_db(order_id)

    if not order:
        # 404 Not Found - Resource doesn't exist
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order

@router.post("/")
async def create_order(order_data: CreateOrderDTO):
    # 400 Bad Request - Invalid input data
    if order_data.delivery_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery date cannot be in the past",
        )

    # 422 Unprocessable Entity - Validation error (Pydantic)
    # Automatically raised by FastAPI for invalid DTO

    return order

@router.delete("/{order_id}")
async def delete_order(order_id: int, current_user: User = Depends(get_current_user)):
    order = get_order_from_db(order_id)

    # 401 Unauthorized - Not authenticated
    # Handled by get_current_user dependency

    # 403 Forbidden - Authenticated but not authorized
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this order",
        )

    # 409 Conflict - Request conflicts with current state
    if order.status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete confirmed order. Cancel it instead.",
        )

    delete_order_from_db(order_id)
    return None


# 5xx - Server Errors
@router.get("/{order_id}")
async def get_order(order_id: int):
    try:
        return get_order_from_db(order_id)
    except DatabaseConnectionError:
        # 503 Service Unavailable - Temporary server issue
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database temporarily unavailable. Please try again.",
        )
    except Exception as e:
        # 500 Internal Server Error - Unexpected server error
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )
```

### Status Code Decision Tree

```python
"""
Status Code Decision Tree:

Request Received
  ↓
  ├─ Is user authenticated?
  │  └─ NO → 401 Unauthorized
  │
  ├─ Does user have permission?
  │  └─ NO → 403 Forbidden
  │
  ├─ Does resource exist?
  │  └─ NO → 404 Not Found
  │
  ├─ Is request data valid?
  │  └─ NO → 400 Bad Request or 422 Unprocessable Entity
  │
  ├─ Does request conflict with current state?
  │  └─ YES → 409 Conflict
  │
  ├─ Can server process request?
  │  └─ NO → 503 Service Unavailable
  │
  └─ Success
     ├─ Created new resource? → 201 Created
     ├─ Returning data? → 200 OK
     └─ No response body? → 204 No Content

Common Status Codes:
  200 OK                   - Success with response body
  201 Created              - Resource created (POST)
  204 No Content           - Success, no response body (DELETE)
  400 Bad Request          - Invalid request data
  401 Unauthorized         - Not authenticated
  403 Forbidden            - Not authorized
  404 Not Found            - Resource doesn't exist
  409 Conflict             - Request conflicts with state
  422 Unprocessable Entity - Validation error
  500 Internal Server Error - Unexpected server error
  503 Service Unavailable  - Temporary server issue
"""
```

## 4. Pagination Best Practices

Implement consistent pagination for list endpoints.

### Offset-Based Pagination

```python
# ✅ CORRECT: Offset-based pagination (simple, good for small datasets)
from fastapi import Query

@router.get("/")
async def list_orders(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    GET /orders?page=1&page_size=50

    Offset-based pagination:
    - Simple to implement
    - Easy to jump to specific page
    - Works well for small datasets
    - Can be slow for large offsets (OFFSET 10000)
    """
    offset = (page - 1) * page_size

    # Query with limit and offset
    statement = select(Order).limit(page_size).offset(offset)
    orders = session.exec(statement).all()

    # Count total
    total_count = session.exec(select(func.count(Order.id))).one()

    return {
        "orders": orders,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "total_pages": (total_count + page_size - 1) // page_size,
            "has_next_page": page * page_size < total_count,
            "has_previous_page": page > 1,
        },
    }
```

### Cursor-Based Pagination

```python
# ✅ CORRECT: Cursor-based pagination (efficient for large datasets)
@router.get("/")
async def list_orders(
    cursor: Optional[int] = Query(None, description="Cursor for next page"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """
    GET /orders?cursor=123&limit=50

    Cursor-based pagination:
    - Efficient for large datasets
    - Consistent results (no duplicates/skips on concurrent inserts)
    - Cannot jump to arbitrary page
    - Better for infinite scroll
    """
    statement = select(Order).order_by(Order.id)

    # Apply cursor (fetch records after cursor)
    if cursor:
        statement = statement.where(Order.id > cursor)

    # Fetch one extra to check if there are more
    orders = session.exec(statement.limit(limit + 1)).all()

    # Check if there are more results
    has_next_page = len(orders) > limit
    if has_next_page:
        orders = orders[:limit]

    # Next cursor is last order ID
    next_cursor = orders[-1].id if orders and has_next_page else None

    return {
        "orders": orders,
        "pagination": {
            "next_cursor": next_cursor,
            "limit": limit,
            "has_next_page": has_next_page,
        },
    }
```

### Link Header Pagination (GitHub Style)

```python
# ✅ CORRECT: Link header pagination (RESTful, discoverable)
from fastapi import Response

@router.get("/")
async def list_orders(
    response: Response,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """
    Returns Link header for next/prev/first/last pages.

    Link: <https://api.example.com/orders?page=2&page_size=50>; rel="next",
          <https://api.example.com/orders?page=5&page_size=50>; rel="last"
    """
    base_url = "https://api.example.com/orders"

    # ... fetch orders ...

    # Build Link header
    links = []

    if page > 1:
        links.append(f'<{base_url}?page=1&page_size={page_size}>; rel="first"')
        links.append(f'<{base_url}?page={page-1}&page_size={page_size}>; rel="prev"')

    if has_next_page:
        links.append(f'<{base_url}?page={page+1}&page_size={page_size}>; rel="next"')
        links.append(f'<{base_url}?page={total_pages}&page_size={page_size}>; rel="last"')

    if links:
        response.headers["Link"] = ", ".join(links)

    return {"orders": orders}
```

## 5. Filtering & Sorting

Support query parameters for filtering and sorting.

### Query Parameter Filtering

```python
# ✅ CORRECT: Multiple query parameters for filtering
from typing import Optional, List

@router.get("/")
async def list_orders(
    # Filtering
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    status: Optional[List[str]] = Query(None, description="Filter by status(es)"),
    min_total: Optional[Decimal] = Query(None, description="Minimum order total"),
    max_total: Optional[Decimal] = Query(None, description="Maximum order total"),
    start_date: Optional[date] = Query(None, description="Start date (inclusive)"),
    end_date: Optional[date] = Query(None, description="End date (exclusive)"),

    # Sorting
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),

    # Pagination
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """
    GET /orders?customer_id=1&status=pending&status=in_progress&min_total=100&sort_by=total&sort_order=desc

    Supports:
    - Multiple filters combined with AND
    - Multiple values for same filter (status=pending&status=completed)
    - Range filters (min_total, max_total)
    - Date range filters
    - Sorting by any field
    - Pagination
    """
    statement = select(Order)

    # Apply filters
    if customer_id:
        statement = statement.where(Order.customer_id == customer_id)

    if status:
        statement = statement.where(Order.status.in_(status))

    if min_total:
        statement = statement.where(Order.total >= min_total)

    if max_total:
        statement = statement.where(Order.total <= max_total)

    if start_date:
        statement = statement.where(Order.confirmed_at >= start_date)

    if end_date:
        statement = statement.where(Order.confirmed_at < end_date)

    # Apply sorting
    sort_column = getattr(Order, sort_by, Order.created_at)
    if sort_order == "desc":
        statement = statement.order_by(sort_column.desc())
    else:
        statement = statement.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    statement = statement.limit(page_size).offset(offset)

    orders = session.exec(statement).all()

    return {"orders": orders}
```

### Advanced Filtering with Filter Objects

```python
# ✅ CORRECT: Complex filtering with dedicated DTO
from pydantic import BaseModel, Field

class OrderFilters(BaseModel):
    """Filter DTO for order queries."""
    customer_ids: Optional[List[int]] = Field(None, description="Customer IDs")
    statuses: Optional[List[str]] = Field(None, description="Order statuses")
    min_total: Optional[Decimal] = Field(None, ge=0, description="Min total")
    max_total: Optional[Decimal] = Field(None, ge=0, description="Max total")
    start_date: Optional[date] = Field(None, description="Start date")
    end_date: Optional[date] = Field(None, description="End date")
    search: Optional[str] = Field(None, description="Search customer name")

@router.post("/search")
async def search_orders(filters: OrderFilters):
    """
    POST /orders/search
    Body: { "customer_ids": [1, 2], "statuses": ["pending"], "min_total": 100 }

    Use POST for complex filtering (many parameters, nested objects).
    """
    statement = select(Order)

    # Apply filters from DTO
    if filters.customer_ids:
        statement = statement.where(Order.customer_id.in_(filters.customer_ids))

    if filters.statuses:
        statement = statement.where(Order.status.in_(filters.statuses))

    # ... other filters ...

    orders = session.exec(statement).all()
    return {"orders": orders}
```

## 6. Consistent Response Structure

Use consistent response format across all endpoints.

### Standard Response Envelope

```python
# ✅ CORRECT: Consistent response structure
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    meta: Optional[dict] = None

# Success response
@router.get("/{order_id}")
async def get_order(order_id: int):
    order = get_order_from_db(order_id)

    if not order:
        return ApiResponse(
            success=False,
            error="Order not found",
        )

    return ApiResponse(
        success=True,
        data=order,
    )

# List response with meta
@router.get("/")
async def list_orders(page: int = 1):
    orders = get_orders_from_db(page)

    return ApiResponse(
        success=True,
        data=orders,
        meta={
            "pagination": {
                "page": page,
                "total_pages": 10,
            }
        },
    )
```

## Best Practices Checklist

- [ ] **Resource-Based URLs**: Use nouns, not verbs
- [ ] **Plural Collections**: `/orders`, not `/order`
- [ ] **Correct HTTP Methods**: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- [ ] **Appropriate Status Codes**: 2xx success, 4xx client error, 5xx server error
- [ ] **Pagination**: All list endpoints support pagination
- [ ] **Filtering**: Support query parameters for common filters
- [ ] **Sorting**: Allow sorting by key fields
- [ ] **Consistent Responses**: Same structure across endpoints
- [ ] **Idempotency**: PUT/PATCH/DELETE are idempotent
- [ ] **Validation**: Validate all input with Pydantic models
- [ ] **Error Messages**: Clear, actionable error messages
- [ ] **API Versioning**: Plan for future changes (e.g., `/v1/orders`)

## Common Pitfalls

### Pitfall 1: Verbs in URLs

```python
# ❌ WRONG: Verbs in URLs
@router.get("/getOrder/{order_id}")
@router.post("/createOrder")

# ✅ CORRECT: Resource-based
@router.get("/{order_id}")
@router.post("/")
```

### Pitfall 2: Wrong HTTP Method

```python
# ❌ WRONG: GET for data modification
@router.get("/delete/{order_id}")

# ✅ CORRECT: DELETE for deletion
@router.delete("/{order_id}")
```

### Pitfall 3: Wrong Status Code

```python
# ❌ WRONG: 200 OK for error
@router.get("/{order_id}")
async def get_order(order_id: int):
    if not order:
        return {"success": False, "error": "Not found"}  # Still returns 200

# ✅ CORRECT: 404 Not Found
@router.get("/{order_id}")
async def get_order(order_id: int):
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
```

### Pitfall 4: No Pagination

```python
# ❌ WRONG: Return all orders (OOM risk)
@router.get("/")
async def list_orders():
    return {"orders": session.exec(select(Order)).all()}

# ✅ CORRECT: Paginated
@router.get("/")
async def list_orders(page: int = 1, page_size: int = 50):
    # ... pagination logic ...
```

## Reference Documents

- FastAPI Backend: `.claude/skills/fastapi-backend.md` (FastAPI patterns)
- Error Handling: `.claude/skills/error-handling-validation.md` (Error responses)

---

**Golden Rule:** Everything related to REST API design → save in `.claude/skills/api-design-rest.md`
