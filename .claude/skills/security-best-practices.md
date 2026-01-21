---
name: Security Best Practices
description: Patterns for input sanitization, authorization, permission checks, data isolation, and least-privilege access
scope: mandatory
applies_to: backend, frontend
---

# Security Best Practices

**Status**: MANDATORY - All security practices MUST be followed

**File Location Rule (permanent):** This file belongs in `.claude/skills/` and defines security patterns for KN KITCHEN.

## Role: Security Best Practices

This skill defines how to build secure applications with proper input sanitization, authorization, data isolation, and least-privilege access.

### Main Responsibilities

1. **Input Sanitization**: Validate and sanitize all user input
2. **Authorization Checks**: Verify user permissions before operations
3. **Data Isolation**: Prevent unauthorized access to data
4. **Authentication**: Enforce authentication on all protected routes
5. **Least Privilege**: Grant minimum permissions necessary
6. **Secure Defaults**: Fail closed, deny by default

### Strictly DOES NOT

- ❌ Trust user input without validation
- ❌ Skip authorization checks (even for admins)
- ❌ Use string concatenation for SQL queries
- ❌ Store passwords in plain text
- ❌ Log sensitive data (passwords, tokens, PII)
- ❌ Expose error details that reveal system internals
- ❌ Use client-side data for authorization decisions

## Core Principles

1. **Defense in Depth**: Multiple layers of security
2. **Principle of Least Privilege**: Minimum permissions required
3. **Fail Closed**: When in doubt, deny access
4. **Zero Trust**: Verify every request, trust nothing
5. **Input Validation**: Validate and sanitize all input
6. **Output Encoding**: Encode output to prevent injection

## 1. Input Sanitization & Escaping

Prevent injection attacks through proper validation and sanitization.

### SQL Injection Prevention

```python
# ✅ CORRECT: Parameterized queries (SQLModel ORM)
from sqlmodel import Session, select

def get_customer_by_email(email: str, session: Session):
    """
    Use SQLModel ORM - automatically parameterizes queries.

    SQLModel generates: SELECT * FROM customer WHERE email = ?
    """
    statement = select(Customer).where(Customer.email == email)
    return session.exec(statement).first()


# ❌ WRONG: String concatenation (SQL injection risk)
def get_customer_by_email_wrong(email: str, session: Session):
    """DANGEROUS: Allows SQL injection."""
    # Attacker input: "test@example.com' OR '1'='1"
    # Resulting query: SELECT * FROM customer WHERE email = 'test@example.com' OR '1'='1'
    query = f"SELECT * FROM customer WHERE email = '{email}'"  # WRONG
    return session.execute(query)


# ✅ CORRECT: Raw SQL with parameters (when ORM isn't suitable)
from sqlalchemy import text

def get_orders_by_date_range_raw(start_date: date, end_date: date, session: Session):
    """Use text() with bound parameters."""
    query = text("""
        SELECT * FROM order
        WHERE confirmed_at >= :start_date
        AND confirmed_at < :end_date
    """)

    # Parameters are automatically escaped
    result = session.execute(
        query,
        {"start_date": start_date, "end_date": end_date}
    )
    return result.all()
```

### XSS Prevention (Cross-Site Scripting)

```typescript
// ✅ CORRECT: React automatically escapes HTML
// app/components/CustomerDetails.tsx
export function CustomerDetails({ customer }) {
  return (
    <div>
      {/* React escapes HTML by default */}
      <h2>{customer.name}</h2> {/* Safe - escaped */}
      <p>{customer.notes}</p> {/* Safe - escaped */}
    </div>
  );
}

// ❌ WRONG: dangerouslySetInnerHTML without sanitization
export function CustomerDetailsWrong({ customer }) {
  return (
    <div>
      {/* DANGEROUS: Allows XSS if customer.notes contains <script> */}
      <div dangerouslySetInnerHTML={{ __html: customer.notes }} /> {/* WRONG */}
    </div>
  );
}

// ✅ CORRECT: Sanitize HTML before rendering
import DOMPurify from "dompurify";

export function CustomerDetailsSafe({ customer }) {
  // Sanitize HTML to remove malicious code
  const sanitizedNotes = DOMPurify.sanitize(customer.notes);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: sanitizedNotes }} />
    </div>
  );
}
```

### Command Injection Prevention

```python
# ❌ WRONG: Shell command with user input (command injection)
import os

def generate_pdf_wrong(order_id: str):
    """DANGEROUS: Allows command injection."""
    # Attacker input: "123; rm -rf /"
    os.system(f"python generate_invoice.py --order-id {order_id}")  # WRONG


# ✅ CORRECT: Use subprocess with argument list
import subprocess

def generate_pdf_safe(order_id: int):
    """Safe: Arguments are not interpreted as shell commands."""
    subprocess.run(
        ["python", "generate_invoice.py", "--order-id", str(order_id)],
        check=True,
        capture_output=True,
    )


# ✅ BETTER: Don't shell out - use Python libraries
def generate_pdf_best(order_id: int):
    """Best: Use Python library directly."""
    from src.services.invoice_service import InvoiceService

    invoice_service = InvoiceService()
    invoice_service.generate_invoice_pdf(order_id)
```

### Path Traversal Prevention

```python
# ❌ WRONG: User-controlled file paths (path traversal)
from pathlib import Path

def get_invoice_wrong(filename: str):
    """DANGEROUS: Allows path traversal."""
    # Attacker input: "../../etc/passwd"
    file_path = Path(f"invoices/{filename}")  # WRONG
    return file_path.read_bytes()


# ✅ CORRECT: Validate and sanitize file paths
def get_invoice_safe(filename: str):
    """Safe: Validates filename and prevents traversal."""
    # 1. Validate filename format
    if not filename.endswith(".pdf"):
        raise ValueError("Invalid file type")

    if ".." in filename or "/" in filename or "\\" in filename:
        raise ValueError("Invalid filename")

    # 2. Construct safe path
    base_dir = Path("invoices").resolve()
    file_path = (base_dir / filename).resolve()

    # 3. Ensure file is within base directory
    if not file_path.is_relative_to(base_dir):
        raise ValueError("Access denied")

    # 4. Check file exists
    if not file_path.exists():
        raise FileNotFoundError("Invoice not found")

    return file_path.read_bytes()
```

## 2. Authorization & Permission Checks

Enforce authorization on every protected operation.

### Authentication Middleware

```python
# ✅ CORRECT: Authentication dependency
# backend/src/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    """
    Extract and verify JWT token, return current user.

    Raises 401 if token is invalid or expired.
    """
    token = credentials.credentials

    try:
        # Verify JWT signature and expiration
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

        # Fetch user from database
        user = session.get(User, user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


# Usage: Require authentication
@router.get("/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    """Protected route - requires authentication."""
    return current_user
```

### Resource-Level Authorization

```python
# ✅ CORRECT: Check resource ownership before operations
@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Delete order - requires ownership.

    Authorization checks:
    1. User is authenticated (get_current_user)
    2. Order exists
    3. User owns the order OR is admin
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    # CRITICAL: Check authorization
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this order",
        )

    # Additional business logic check
    if order.status == "confirmed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete confirmed order",
        )

    session.delete(order)
    session.commit()

    return {"success": True}


# ❌ WRONG: No authorization check
@router.delete("/{order_id}")
async def delete_order_wrong(
    order_id: int,
    current_user: User = Depends(get_current_user),  # Authenticated but not authorized
    session: Session = Depends(get_session),
):
    """DANGEROUS: Any authenticated user can delete any order."""
    order = session.get(Order, order_id)
    session.delete(order)  # WRONG: No ownership check
    session.commit()
    return {"success": True}
```

### Role-Based Access Control (RBAC)

```python
# ✅ CORRECT: Role-based authorization
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"
    READONLY = "readonly"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    role: UserRole = Field(default=UserRole.STAFF)


# Role check dependency
def require_role(required_role: UserRole):
    """Dependency factory for role-based authorization."""
    def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role",
            )
        return current_user

    return check_role


# Usage: Admin-only routes
@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin-only: Delete customer."""
    # Only admins can reach this code
    delete_customer_from_db(customer_id)
    return {"success": True}


# Multiple role authorization
def require_any_role(*roles: UserRole):
    """Allow multiple roles."""
    def check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(roles)}",
            )
        return current_user

    return check_role


@router.post("/orders")
async def create_order(
    order_data: CreateOrderDTO,
    current_user: User = Depends(require_any_role(UserRole.ADMIN, UserRole.STAFF)),
):
    """Allow admins and staff to create orders."""
    return create_order_in_db(order_data)
```

## 3. Data Isolation

Ensure users can only access their own data.

### User-Scoped Queries

```python
# ✅ CORRECT: Automatically filter by user
@router.get("/orders")
async def list_orders(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    List orders - user sees only their own orders.

    Admins see all orders.
    """
    statement = select(Order)

    # CRITICAL: Filter by user (unless admin)
    if not current_user.is_admin:
        statement = statement.where(Order.user_id == current_user.id)

    orders = session.exec(statement).all()
    return {"orders": orders}


# ❌ WRONG: No user filtering
@router.get("/orders")
async def list_orders_wrong(
    current_user: User = Depends(get_current_user),  # Authenticated
    session: Session = Depends(get_session),
):
    """DANGEROUS: User can see all orders, not just their own."""
    orders = session.exec(select(Order)).all()  # WRONG: No filtering
    return {"orders": orders}
```

### Query Parameter Validation

```python
# ✅ CORRECT: Validate user can access requested resources
@router.get("/")
async def list_orders(
    customer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Filter orders by customer - with authorization."""
    statement = select(Order)

    # Apply user filter (unless admin)
    if not current_user.is_admin:
        statement = statement.where(Order.user_id == current_user.id)

    # Apply customer filter
    if customer_id:
        # CRITICAL: Verify user can access this customer
        customer = session.get(Customer, customer_id)

        if not customer:
            raise HTTPException(404, "Customer not found")

        # Check authorization
        if customer.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(
                403,
                "You don't have permission to view this customer's orders",
            )

        statement = statement.where(Order.customer_id == customer_id)

    orders = session.exec(statement).all()
    return {"orders": orders}
```

### Frontend Data Isolation

```typescript
// ✅ CORRECT: Backend enforces isolation, frontend requests filtered data
// app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Fetch orders - backend filters by current user
    fetch("/api/orders", {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setOrders(data.orders));
  }, []);

  return (
    <div>
      <h1>My Orders</h1>
      {/* Display only user's orders */}
      {orders.map((order) => (
        <div key={order.id}>{order.id}</div>
      ))}
    </div>
  );
}

// ❌ WRONG: Client-side filtering (security by obscurity)
export default function OrdersPageWrong() {
  const [orders, setOrders] = useState([]);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    // Fetches ALL orders from backend
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        // WRONG: Client-side filtering (user can bypass in DevTools)
        const myOrders = data.orders.filter(
          (order) => order.user_id === currentUserId
        );
        setOrders(myOrders);
      });
  }, []);

  // User can inspect network tab and see all orders
}
```

## 4. Least-Privilege Access Principle

Grant minimum permissions necessary.

### Database User Permissions

```sql
-- ✅ CORRECT: Least-privilege database user
-- Application user: read/write to application tables only
CREATE USER app_user WITH PASSWORD 'secure_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON orders TO app_user;
GRANT SELECT, INSERT, UPDATE ON customers TO app_user;
GRANT SELECT ON menu_items TO app_user;  -- Read-only for menu

-- Deny dangerous operations
-- NO DELETE on orders (use soft delete instead)
-- NO DROP, TRUNCATE, ALTER
-- NO access to other schemas


-- Read-only reporting user
CREATE USER reporting_user WITH PASSWORD 'reporting_password';
GRANT SELECT ON orders TO reporting_user;
GRANT SELECT ON customers TO reporting_user;
-- No INSERT, UPDATE, DELETE
```

### API Token Scopes

```python
# ✅ CORRECT: Token scopes for fine-grained permissions
from typing import List

class TokenScope(str, Enum):
    """Available token scopes."""
    ORDERS_READ = "orders:read"
    ORDERS_WRITE = "orders:write"
    CUSTOMERS_READ = "customers:read"
    CUSTOMERS_WRITE = "customers:write"
    REPORTS_READ = "reports:read"
    ADMIN_ALL = "admin:all"


def create_access_token(user_id: int, scopes: List[TokenScope]) -> str:
    """Create JWT with specific scopes."""
    payload = {
        "sub": str(user_id),
        "scopes": [scope.value for scope in scopes],
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_scope(required_scope: TokenScope):
    """Dependency: Check token has required scope."""
    def check_scope(current_user: User = Depends(get_current_user)) -> User:
        # Extract scopes from token
        token_scopes = get_token_scopes()  # From JWT payload

        if required_scope.value not in token_scopes:
            raise HTTPException(
                status_code=403,
                detail=f"Requires scope: {required_scope.value}",
            )

        return current_user

    return check_scope


# Usage: Scope-protected routes
@router.post("/orders")
async def create_order(
    order_data: CreateOrderDTO,
    current_user: User = Depends(require_scope(TokenScope.ORDERS_WRITE)),
):
    """Requires 'orders:write' scope."""
    return create_order_in_db(order_data)
```

### Environment-Based Restrictions

```python
# ✅ CORRECT: Restrict dangerous operations in production
from src.config import settings

@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: int,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Delete customer - disabled in production."""

    # CRITICAL: Prevent accidental deletion in production
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403,
            detail="Customer deletion disabled in production. Use archive instead.",
        )

    delete_customer_from_db(customer_id)
    return {"success": True}
```

## 5. Secure Configuration

Store secrets securely and use secure defaults.

### Environment Variables for Secrets

```python
# ✅ CORRECT: Secrets in environment variables
# backend/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings from environment."""

    # Database
    DATABASE_URL: str  # Required - no default

    # JWT
    JWT_SECRET: str  # Required - no default
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Sanity CMS
    SANITY_PROJECT_ID: str
    SANITY_DATASET: str
    SANITY_TOKEN: str  # Required for mutations

    # Feature flags
    ENABLE_REGISTRATION: bool = False  # Secure default: disabled
    ENABLE_DRAFT_CLEANUP: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()


# ❌ WRONG: Hardcoded secrets
JWT_SECRET = "my-secret-key-123"  # WRONG: Committed to git
DATABASE_URL = "postgresql://user:password@localhost/db"  # WRONG
```

### Secure Defaults

```python
# ✅ CORRECT: Fail closed (deny by default)
class Settings(BaseSettings):
    # Secure defaults
    ALLOW_REGISTRATION: bool = False  # Default: disabled
    ENABLE_DEBUG_MODE: bool = False   # Default: disabled
    REQUIRE_EMAIL_VERIFICATION: bool = True  # Default: enabled
    SESSION_TIMEOUT_MINUTES: int = 30  # Default: 30 minutes


# ❌ WRONG: Insecure defaults
class SettingsWrong(BaseSettings):
    ALLOW_REGISTRATION: bool = True   # WRONG: Open by default
    ENABLE_DEBUG_MODE: bool = True    # WRONG: Debug enabled by default
    REQUIRE_EMAIL_VERIFICATION: bool = False  # WRONG: No verification
```

## Best Practices Checklist

- [ ] **Input Validation**: Validate all user input with Pydantic/Zod
- [ ] **SQL Injection**: Use ORM or parameterized queries (never string concat)
- [ ] **XSS Prevention**: React auto-escapes, sanitize dangerouslySetInnerHTML
- [ ] **Authentication**: Verify JWT on every protected route
- [ ] **Authorization**: Check resource ownership before operations
- [ ] **User Isolation**: Filter queries by user_id (unless admin)
- [ ] **Role-Based Access**: Implement RBAC for admin functions
- [ ] **Least Privilege**: Grant minimum permissions necessary
- [ ] **Secure Defaults**: Fail closed, deny by default
- [ ] **Environment Variables**: Store secrets in .env (not in code)
- [ ] **HTTPS Only**: All production traffic uses HTTPS
- [ ] **Token Expiration**: JWTs expire within 24 hours
- [ ] **Rate Limiting**: Prevent brute force attacks
- [ ] **Audit Logging**: Log security-relevant events

## Common Pitfalls

### Pitfall 1: No Authorization Check

```python
# ❌ WRONG: Authentication without authorization
@router.delete("/{order_id}")
async def delete_order(
    order_id: int,
    current_user: User = Depends(get_current_user),  # Authenticated
):
    # WRONG: No check if user owns this order
    delete_order_from_db(order_id)

# ✅ CORRECT: Check ownership
@router.delete("/{order_id}")
async def delete_order(order_id: int, current_user: User = Depends(get_current_user)):
    order = get_order_from_db(order_id)
    if order.user_id != current_user.id:  # Check ownership
        raise HTTPException(403, "Forbidden")
    delete_order_from_db(order_id)
```

### Pitfall 2: Client-Side Authorization

```typescript
// ❌ WRONG: Client-side permission check
export default function DeleteButton({ order }) {
  const currentUser = getCurrentUser();

  // WRONG: Client-side check (user can bypass)
  if (order.user_id !== currentUser.id) {
    return null; // Hide button
  }

  const handleDelete = async () => {
    // But API call still works if user modifies code
    await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
  };

  return <button onClick={handleDelete}>Delete</button>;
}

// ✅ CORRECT: Backend enforces, frontend displays appropriately
export default function DeleteButton({ order }) {
  const handleDelete = async () => {
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });

    if (res.status === 403) {
      // Backend denied - show error
      alert("You don't have permission to delete this order");
    }
  };

  // Show button, backend enforces permission
  return <button onClick={handleDelete}>Delete</button>;
}
```

### Pitfall 3: Trusting User Input

```python
# ❌ WRONG: Trust user-provided IDs
@router.post("/transfer-ownership")
async def transfer_ownership(
    order_id: int,
    new_owner_id: int,  # WRONG: User can set any ID
    current_user: User = Depends(get_current_user),
):
    # WRONG: No validation of new_owner_id
    order = get_order_from_db(order_id)
    order.user_id = new_owner_id  # WRONG
    save_order(order)

# ✅ CORRECT: Validate new owner exists and is valid
@router.post("/transfer-ownership")
async def transfer_ownership(
    order_id: int,
    new_owner_email: str,  # Use email (validated), not ID
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    # Validate order ownership
    order = session.get(Order, order_id)
    if order.user_id != current_user.id:
        raise HTTPException(403, "Forbidden")

    # Validate new owner exists
    new_owner = session.exec(
        select(User).where(User.email == new_owner_email)
    ).first()

    if not new_owner:
        raise HTTPException(404, "User not found")

    # Transfer ownership
    order.user_id = new_owner.id
    session.add(order)
    session.commit()
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (User Isolation, Security Rules)
- JWT Security: `.claude/skills/jwt-security.md` (Token verification)
- Better Auth: `.claude/skills/better-auth.md` (Authentication patterns)
- Error Handling: `.claude/skills/error-handling-validation.md` (Input validation)

---

**Golden Rule:** Everything related to security → save in `.claude/skills/security-best-practices.md`
