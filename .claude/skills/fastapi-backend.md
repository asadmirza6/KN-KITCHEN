---
name: FastAPI Backend Development
description: Best practices for FastAPI development including dependency injection, JWT middleware, Pydantic validation, clean routes, and async patterns
scope: mandatory
applies_to: backend
---

# FastAPI Backend Development

**Status**: MANDATORY - All backend code MUST follow these patterns

## Overview

The KN KITCHEN backend is built with FastAPI, a modern async Python web framework. This skill defines the patterns, practices, and anti-patterns for backend development.

**Technology Stack:**
- Python 3.11+
- FastAPI (web framework)
- SQLModel (ORM, combines SQLAlchemy + Pydantic)
- Pydantic (validation, serialization)
- Better Auth (JWT authentication)
- Neon PostgreSQL (database)

## Core Principles

1. **Dependency Injection First**: Use FastAPI's DI system for all dependencies
2. **Validation at Boundaries**: Validate all input with Pydantic models
3. **Async-Safe**: Properly handle async/await to avoid blocking
4. **Type Safety**: Use Python type hints everywhere
5. **Clean Separation**: Routes handle HTTP, services handle business logic

## 1. Dependency Injection

FastAPI's dependency injection system is the REQUIRED way to manage dependencies. Never instantiate services directly.

### Basic Dependency Injection

```python
# ✅ CORRECT: Using FastAPI dependencies
# backend/src/api/dependencies.py
from typing import Annotated
from fastapi import Depends
from sqlmodel import Session
from ..database import get_session
from ..services.order_service import OrderService

def get_order_service(
    session: Annotated[Session, Depends(get_session)]
) -> OrderService:
    """Dependency factory for OrderService"""
    return OrderService(session)

# backend/src/api/routes/orders.py
from fastapi import APIRouter, Depends
from typing import Annotated

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/")
async def create_order(
    order_data: CreateOrderDTO,
    order_service: Annotated[OrderService, Depends(get_order_service)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Create a new order - dependencies injected automatically"""
    return await order_service.create_order(order_data, current_user.id)
```

```python
# ❌ WRONG: Direct instantiation
@router.post("/")
async def create_order(order_data: CreateOrderDTO):
    # Hard-coded dependency - can't test, can't swap implementations
    service = OrderService(get_session())  # Don't do this!
    return await service.create_order(order_data)
```

### Database Session Dependency

```python
# ✅ CORRECT: Session management via dependency
# backend/src/database.py
from sqlmodel import Session, create_engine
from typing import Generator
import os

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=False)

def get_session() -> Generator[Session, None, None]:
    """Database session dependency - auto commits/rollbacks"""
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise

# Usage in routes
from typing import Annotated
from fastapi import Depends

@router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: int,
    session: Annotated[Session, Depends(get_session)]
):
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
```

### Nested Dependencies

```python
# ✅ CORRECT: Dependencies can depend on other dependencies
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[Session, Depends(get_session)]
) -> User:
    """Extract and validate user from JWT token"""
    payload = verify_jwt_token(token)
    user = session.get(User, payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

def require_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Require admin role - depends on get_current_user"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Usage - dependencies chain automatically
@router.delete("/orders/{order_id}")
async def delete_order(
    order_id: int,
    admin_user: Annotated[User, Depends(require_admin)]  # Chains through get_current_user
):
    # Only admins can delete orders
    pass
```

### Dependency Scopes

```python
# ✅ CORRECT: Different dependency scopes
# backend/src/api/dependencies.py

# Request-scoped (default) - new instance per request
def get_order_service(session: Annotated[Session, Depends(get_session)]):
    return OrderService(session)

# Application-scoped (singleton) - share across requests
from functools import lru_cache

@lru_cache()
def get_settings():
    """Cached settings - loaded once at startup"""
    return Settings()

# Background task - depends on nothing
async def send_order_confirmation_email(order_id: int):
    """Background task - runs after response sent"""
    # Fetch order and send email
    pass

@router.post("/orders")
async def create_order(
    order_data: CreateOrderDTO,
    background_tasks: BackgroundTasks,
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    order = await order_service.create_order(order_data)
    # Queue background task (don't await)
    background_tasks.add_task(send_order_confirmation_email, order.id)
    return order
```

## 2. JWT Middleware and Authentication

Authentication MUST be enforced on all routes except login and public endpoints.

### JWT Configuration

```python
# ✅ CORRECT: JWT setup with Better Auth or custom implementation
# backend/src/auth/jwt.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict) -> str:
    """Generate JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

### Authentication Dependency

```python
# ✅ CORRECT: Auth dependency for protected routes
# backend/src/api/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Annotated

security = HTTPBearer()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    session: Annotated[Session, Depends(get_session)]
) -> User:
    """Extract user from JWT token - use on all protected routes"""
    token = credentials.credentials
    payload = verify_jwt_token(token)

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

### Protected Routes

```python
# ✅ CORRECT: Protect routes with authentication
# backend/src/api/routes/orders.py

@router.get("/")
async def list_orders(
    current_user: Annotated[User, Depends(get_current_user)],  # Auth required
    session: Annotated[Session, Depends(get_session)]
):
    """List all orders - authentication required"""
    statement = select(Order)
    orders = session.exec(statement).all()
    return orders

@router.get("/{order_id}")
async def get_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],  # Auth required
    session: Annotated[Session, Depends(get_session)]
):
    """Get single order - authentication required"""
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
```

### Login Endpoint (Public)

```python
# ✅ CORRECT: Login endpoint without auth requirement
# backend/src/api/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException
from ..schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/login")
async def login(
    credentials: LoginRequest,
    session: Annotated[Session, Depends(get_session)]
) -> TokenResponse:
    """Login endpoint - public, no authentication required"""
    # Verify credentials
    user = session.exec(
        select(User).where(User.email == credentials.email)
    ).first()

    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    # Generate token
    access_token = create_access_token({"user_id": user.id})
    return TokenResponse(access_token=access_token, token_type="bearer")
```

### Global Authentication (Alternative)

```python
# ✅ ALTERNATIVE: Apply auth globally, exclude specific routes
# backend/src/main.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()

PUBLIC_PATHS = ["/auth/login", "/health", "/docs", "/openapi.json"]

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Global auth middleware - excludes public paths"""
    if request.url.path not in PUBLIC_PATHS:
        # Verify JWT token in Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid authorization header"}
            )

        token = auth_header.split(" ")[1]
        try:
            verify_jwt_token(token)
        except HTTPException:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"}
            )

    response = await call_next(request)
    return response
```

**Note**: Prefer dependency-based auth over middleware for better testability and explicit route requirements.

## 3. Pydantic Validation

ALL request and response data MUST use Pydantic models for validation.

### Request Models (DTOs)

```python
# ✅ CORRECT: Input validation with Pydantic
# backend/src/schemas/orders.py
from pydantic import BaseModel, Field, validator
from datetime import date
from typing import Optional, List
from decimal import Decimal

class OrderItemDTO(BaseModel):
    """Order line item input"""
    item_id: str  # Sanity CMS item ID
    quantity: int = Field(gt=0, description="Quantity must be positive")

    @validator("quantity")
    def validate_quantity(cls, v):
        if v > 1000:
            raise ValueError("Quantity cannot exceed 1000")
        return v

class CreateOrderDTO(BaseModel):
    """Create order request"""
    customer_id: int = Field(gt=0)
    items: List[OrderItemDTO] = Field(min_items=1)
    delivery_date: date
    notes: Optional[str] = Field(None, max_length=500)

    @validator("delivery_date")
    def validate_delivery_date(cls, v):
        if v < date.today():
            raise ValueError("Delivery date cannot be in the past")
        return v

    class Config:
        schema_extra = {
            "example": {
                "customer_id": 123,
                "items": [
                    {"item_id": "menu-item-1", "quantity": 10}
                ],
                "delivery_date": "2026-01-20",
                "notes": "Please call before delivery"
            }
        }

class UpdateOrderDTO(BaseModel):
    """Update order request - all fields optional"""
    customer_id: Optional[int] = None
    items: Optional[List[OrderItemDTO]] = None
    delivery_date: Optional[date] = None
    notes: Optional[str] = None
```

### Response Models

```python
# ✅ CORRECT: Response models for consistent API contracts
# backend/src/schemas/orders.py
from datetime import datetime

class OrderItemResponse(BaseModel):
    """Order line item response"""
    id: int
    item_id: str
    item_name: str
    quantity: int
    price_at_order: Decimal
    subtotal: Decimal

    class Config:
        orm_mode = True  # Allow SQLModel -> Pydantic conversion

class OrderResponse(BaseModel):
    """Order response"""
    id: int
    customer_id: int
    customer_name: str
    status: str
    items: List[OrderItemResponse]
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    delivery_date: date
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Usage in route
@router.post("/", response_model=OrderResponse)
async def create_order(
    order_data: CreateOrderDTO,
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Pydantic validates input AND output"""
    order = await order_service.create_order(order_data)
    return order  # Auto-converted to OrderResponse
```

### Validation Error Handling

```python
# ✅ CORRECT: FastAPI handles validation errors automatically
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Custom validation error response"""
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": exc.errors()
        }
    )

# Example validation error response:
# {
#   "detail": "Validation error",
#   "errors": [
#     {
#       "loc": ["body", "delivery_date"],
#       "msg": "Delivery date cannot be in the past",
#       "type": "value_error"
#     }
#   ]
# }
```

### Custom Validators

```python
# ✅ CORRECT: Custom validators for business rules
from pydantic import validator, root_validator

class CreateOrderDTO(BaseModel):
    customer_id: int
    items: List[OrderItemDTO]
    discount_code: Optional[str] = None

    @validator("discount_code")
    def validate_discount_code(cls, v):
        """Validate discount code format"""
        if v and not v.startswith("DISC-"):
            raise ValueError("Discount code must start with 'DISC-'")
        return v

    @root_validator
    def validate_minimum_order(cls, values):
        """Validate total quantity across all items"""
        items = values.get("items", [])
        total_quantity = sum(item.quantity for item in items)

        if total_quantity < 10:
            raise ValueError("Minimum order quantity is 10 items")

        return values
```

## 4. Clean Route Structure

Organize routes by domain/resource, keep route handlers thin, delegate to services.

### Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py          # Authentication routes
│   │   │   ├── orders.py        # Order management routes
│   │   │   ├── customers.py     # Customer routes
│   │   │   ├── invoices.py      # Billing routes
│   │   │   └── reports.py       # Reporting routes
│   │   └── dependencies.py      # Shared dependencies
│   ├── services/
│   │   ├── order_service.py     # Order business logic
│   │   ├── customer_service.py  # Customer business logic
│   │   └── billing_service.py   # Billing business logic
│   ├── models/
│   │   ├── order.py             # SQLModel Order model
│   │   ├── customer.py          # SQLModel Customer model
│   │   └── invoice.py           # SQLModel Invoice model
│   ├── schemas/
│   │   ├── orders.py            # Pydantic DTOs for orders
│   │   ├── customers.py         # Pydantic DTOs for customers
│   │   └── auth.py              # Pydantic DTOs for auth
│   ├── database.py              # Database connection
│   ├── config.py                # Configuration
│   └── main.py                  # FastAPI app
├── tests/
└── requirements.txt
```

### Router Organization

```python
# ✅ CORRECT: Organized routers by resource
# backend/src/api/routes/orders.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, List

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    responses={404: {"description": "Order not found"}}
)

@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    skip: int = 0,
    limit: int = 100,
    current_user: Annotated[User, Depends(get_current_user)],
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """List all orders with pagination"""
    return await order_service.list_orders(skip, limit)

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Get order by ID"""
    order = await order_service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: CreateOrderDTO,
    current_user: Annotated[User, Depends(get_current_user)],
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Create new order"""
    return await order_service.create_order(order_data, current_user.id)

@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: int,
    order_data: UpdateOrderDTO,
    current_user: Annotated[User, Depends(get_current_user)],
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Update existing order"""
    order = await order_service.update_order(order_id, order_data)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.post("/{order_id}/confirm", response_model=OrderResponse)
async def confirm_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Transition order from draft to confirmed"""
    try:
        return await order_service.confirm_order(order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Main App Assembly

```python
# ✅ CORRECT: Assemble routers in main app
# backend/src/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import auth, orders, customers, invoices, reports

app = FastAPI(
    title="KN KITCHEN API",
    description="Catering order management system",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(invoices.router)
app.include_router(reports.router)

@app.get("/health")
async def health_check():
    """Health check endpoint - public"""
    return {"status": "healthy"}
```

### Thin Controllers, Fat Services

```python
# ✅ CORRECT: Route delegates to service
# backend/src/api/routes/orders.py
@router.post("/", response_model=OrderResponse)
async def create_order(
    order_data: CreateOrderDTO,
    current_user: Annotated[User, Depends(get_current_user)],
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Route handler is thin - just HTTP concerns"""
    return await order_service.create_order(order_data, current_user.id)

# backend/src/services/order_service.py
class OrderService:
    def __init__(self, session: Session):
        self.session = session

    async def create_order(self, order_data: CreateOrderDTO, user_id: int) -> Order:
        """Service contains business logic"""
        # Validate customer exists
        customer = self.session.get(Customer, order_data.customer_id)
        if not customer:
            raise ValueError("Customer not found")

        # Fetch current menu prices from Sanity
        menu_items = await self.get_menu_items(order_data.items)

        # Calculate order totals
        subtotal = self.calculate_subtotal(order_data.items, menu_items)
        tax = subtotal * Decimal("0.1")  # 10% tax
        total = subtotal + tax

        # Create order
        order = Order(
            customer_id=order_data.customer_id,
            status="draft",
            subtotal=subtotal,
            tax=tax,
            total=total,
            delivery_date=order_data.delivery_date,
            notes=order_data.notes,
            created_by=user_id
        )

        self.session.add(order)
        self.session.flush()  # Get order.id

        # Create line items
        for item_data in order_data.items:
            menu_item = menu_items[item_data.item_id]
            line_item = OrderLineItem(
                order_id=order.id,
                item_id=item_data.item_id,
                item_name=menu_item["name"],
                quantity=item_data.quantity,
                price_at_order=Decimal(menu_item["price"]),
                subtotal=Decimal(menu_item["price"]) * item_data.quantity
            )
            self.session.add(line_item)

        self.session.commit()
        self.session.refresh(order)
        return order
```

```python
# ❌ WRONG: Business logic in route handler
@router.post("/")
async def create_order(
    order_data: CreateOrderDTO,
    session: Annotated[Session, Depends(get_session)]
):
    """Don't put business logic in routes!"""
    # Too much logic here - should be in service
    customer = session.get(Customer, order_data.customer_id)
    if not customer:
        raise HTTPException(status_code=404)

    # Calculating totals in route - bad!
    subtotal = sum(item.price * item.quantity for item in order_data.items)
    # ... more business logic ...
```

## 5. Async-Safe Patterns

FastAPI supports both sync and async. Use async properly to avoid blocking.

### When to Use Async

```python
# ✅ CORRECT: Use async for I/O-bound operations
# Database queries
@router.get("/orders")
async def list_orders(session: Annotated[Session, Depends(get_session)]):
    """Async route for database I/O"""
    statement = select(Order)
    orders = session.exec(statement).all()
    return orders

# External API calls
async def fetch_menu_items():
    """Async for external HTTP requests"""
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.sanity.io/...")
        return response.json()

# File I/O
async def read_invoice_template():
    """Async for file operations"""
    async with aiofiles.open("templates/invoice.html", "r") as f:
        return await f.read()
```

### When to Use Sync

```python
# ✅ CORRECT: Use sync for CPU-bound operations
def calculate_order_total(items: List[OrderItem]) -> Decimal:
    """Sync for pure computation - no I/O"""
    subtotal = sum(item.price * item.quantity for item in items)
    tax = subtotal * Decimal("0.1")
    return subtotal + tax

def generate_invoice_pdf(order: Order) -> bytes:
    """Sync for CPU-intensive PDF generation"""
    # ReportLab is synchronous
    pdf_buffer = BytesIO()
    # ... PDF generation ...
    return pdf_buffer.getvalue()
```

### Mixing Async and Sync

```python
# ✅ CORRECT: Call sync code from async route
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

@router.post("/invoices/{order_id}")
async def generate_invoice(
    order_id: int,
    order_service: Annotated[OrderService, Depends(get_order_service)]
):
    """Async route calling sync PDF generation"""
    # Fetch order (async I/O)
    order = await order_service.get_order(order_id)

    # Generate PDF (sync CPU-bound) - run in thread pool
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(
        executor,
        generate_invoice_pdf,
        order
    )

    # Save to storage (async I/O)
    await save_pdf_to_storage(order_id, pdf_bytes)

    return {"invoice_url": f"/invoices/{order_id}.pdf"}
```

### Async Database Sessions

```python
# ✅ CORRECT: Async database operations (if using async SQLModel)
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine

async_engine = create_async_engine(DATABASE_URL, echo=False)

async def get_async_session() -> AsyncSession:
    async with AsyncSession(async_engine) as session:
        yield session

@router.get("/orders")
async def list_orders(
    session: Annotated[AsyncSession, Depends(get_async_session)]
):
    """Fully async database query"""
    result = await session.execute(select(Order))
    orders = result.scalars().all()
    return orders
```

**Note**: For KN KITCHEN, synchronous SQLModel sessions are acceptable. Use async sessions only if performance profiling shows blocking I/O issues.

### Async Anti-Patterns

```python
# ❌ WRONG: Blocking call in async function
import time

@router.get("/slow")
async def slow_endpoint():
    time.sleep(5)  # BLOCKS the event loop - don't do this!
    return {"status": "done"}

# ✅ CORRECT: Use asyncio.sleep for async waiting
import asyncio

@router.get("/slow")
async def slow_endpoint():
    await asyncio.sleep(5)  # Non-blocking
    return {"status": "done"}
```

```python
# ❌ WRONG: Not awaiting async calls
@router.get("/orders")
async def list_orders(order_service: OrderService):
    orders = order_service.list_orders()  # Forgot await!
    return orders  # Returns coroutine, not data

# ✅ CORRECT: Await async calls
@router.get("/orders")
async def list_orders(order_service: OrderService):
    orders = await order_service.list_orders()  # Properly awaited
    return orders
```

## Best Practices Checklist

Before merging backend code, verify:

- [ ] **Dependencies Injected**: All services use `Depends()`, no direct instantiation
- [ ] **Authentication Required**: All routes except login/health use `get_current_user` dependency
- [ ] **Pydantic Validation**: All request/response use Pydantic models (DTOs)
- [ ] **Type Hints**: All functions have parameter and return type hints
- [ ] **Thin Routes**: Route handlers delegate to service layer
- [ ] **Business Logic in Services**: Calculations, validations, state transitions in services
- [ ] **Async Correctly**: Async for I/O, sync for CPU, properly awaited
- [ ] **Error Handling**: HTTPException for API errors, custom messages
- [ ] **Status Codes**: Correct HTTP status codes (201 for create, 404 for not found)
- [ ] **Response Models**: `response_model` specified for consistent contracts
- [ ] **Database Sessions**: Use dependency-injected sessions, auto-commit/rollback
- [ ] **No Secrets in Code**: Environment variables for sensitive data

## Example Service Pattern

```python
# ✅ CORRECT: Complete service example
# backend/src/services/order_service.py
from sqlmodel import Session, select
from typing import List, Optional
from decimal import Decimal
from ..models.order import Order, OrderLineItem
from ..models.customer import Customer
from ..schemas.orders import CreateOrderDTO, UpdateOrderDTO

class OrderService:
    """Order management business logic"""

    def __init__(self, session: Session):
        self.session = session

    async def list_orders(self, skip: int = 0, limit: int = 100) -> List[Order]:
        """List all orders with pagination"""
        statement = select(Order).offset(skip).limit(limit)
        return self.session.exec(statement).all()

    async def get_order(self, order_id: int) -> Optional[Order]:
        """Get order by ID"""
        return self.session.get(Order, order_id)

    async def create_order(self, order_data: CreateOrderDTO, user_id: int) -> Order:
        """Create new draft order"""
        # Validate customer
        customer = self.session.get(Customer, order_data.customer_id)
        if not customer:
            raise ValueError("Customer not found")

        # Fetch menu prices (external API call)
        menu_items = await self._fetch_menu_items()

        # Calculate totals
        subtotal = self._calculate_subtotal(order_data.items, menu_items)
        tax = subtotal * Decimal("0.1")
        total = subtotal + tax

        # Create order
        order = Order(
            customer_id=order_data.customer_id,
            status="draft",
            subtotal=subtotal,
            tax=tax,
            total=total,
            delivery_date=order_data.delivery_date,
            notes=order_data.notes,
            created_by=user_id
        )

        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)

        return order

    async def confirm_order(self, order_id: int) -> Order:
        """Transition order from draft to confirmed"""
        order = self.session.get(Order, order_id)
        if not order:
            raise ValueError("Order not found")

        if order.status != "draft":
            raise ValueError(f"Cannot confirm order in status: {order.status}")

        # State transition
        order.status = "confirmed"
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)

        return order

    def _calculate_subtotal(self, items, menu_items) -> Decimal:
        """Private helper - pure calculation"""
        # Implementation...
        pass

    async def _fetch_menu_items(self):
        """Private helper - external API call"""
        # Implementation...
        pass
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Technical Stack)
- System Architecture: `.claude/skills/system-architecture.md` (Domain Boundaries)
- Spec-Driven Development: `.claude/skills/spec-driven-development.md` (Workflow)

---

**Remember**: FastAPI's power comes from its dependency injection system, type safety, and async support. Use these features correctly to build a maintainable, performant backend.
