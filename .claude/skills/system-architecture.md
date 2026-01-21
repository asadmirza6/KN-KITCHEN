---
name: System Architecture
description: Defines frontend/backend separation, CMS vs transactional data, domain boundaries, and coupling avoidance
scope: mandatory
applies_to: all
---

# System Architecture

**Status**: MANDATORY - All agents MUST follow these architectural principles

## Architecture Overview

KN KITCHEN follows a **three-tier architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│              Next.js 14+ App Router (Frontend)              │
│         React Components, Client State, UI Logic            │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│                 FastAPI (Backend API)                        │
│      Business Logic, Validation, State Transitions          │
└─────────────────────────────────────────────────────────────┘
                 ↓                              ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│    DATA LAYER            │    │   CONTENT LAYER          │
│  Neon PostgreSQL         │    │   Sanity.io CMS          │
│  (Transactional Data)    │    │   (Menu/Content)         │
└──────────────────────────┘    └──────────────────────────┘
```

## Core Architectural Principles

### 1. Frontend/Backend Separation

**Rule**: Frontend and backend are SEPARATE applications communicating ONLY via HTTP API.

**Frontend Responsibilities (Next.js):**
- UI rendering and user interactions
- Form validation (client-side, UX convenience only)
- Client-side state management (UI state, form state)
- Routing and navigation
- Calling backend API endpoints
- Displaying data from backend

**Backend Responsibilities (FastAPI):**
- Business logic enforcement
- Data validation (authoritative, never trust frontend)
- Database operations (CRUD for orders, customers, invoices)
- Authentication and authorization
- Order state transitions (draft → confirmed)
- Invoice PDF generation
- Reporting and analytics

**Prohibited:**
- ❌ Frontend directly accessing database
- ❌ Frontend implementing business logic (e.g., calculating order totals)
- ❌ Backend rendering UI components
- ❌ Shared code between frontend and backend (except type definitions via OpenAPI)
- ❌ Frontend bypassing backend to call external APIs

**Communication Contract:**
```
Frontend → HTTP Request → Backend API → Database/CMS
Frontend ← HTTP Response ← Backend API ← Database/CMS
```

**Example - Correct Separation:**
```typescript
// ✅ CORRECT: Frontend calls backend API
// frontend/src/services/orders.ts
export async function createOrder(orderData: CreateOrderDTO) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
  return response.json();
}

// Backend handles business logic
// backend/src/api/orders.py
@router.post("/orders")
async def create_order(order: CreateOrderDTO, db: Session):
    # Validate, calculate totals, persist
    new_order = Order(**order.dict())
    new_order.total = calculate_order_total(new_order)  # Business logic
    db.add(new_order)
    db.commit()
    return new_order
```

**Anti-Pattern - Violation:**
```typescript
// ❌ WRONG: Frontend implementing business logic
// frontend/src/components/OrderForm.tsx
function calculateOrderTotal(items: OrderItem[]) {
  // Business logic in frontend - PROHIBITED
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

### 2. CMS vs Transactional Data Separation

**Rule**: Content (menu items, pricing) lives in Sanity CMS. Transactional data (orders, customers, invoices) lives in PostgreSQL.

**Sanity CMS (Content Layer):**
- Menu items (name, description, category, image)
- Pricing information
- Menu availability
- Marketing content
- Static page content
- Media assets (images, documents)

**PostgreSQL (Transactional Layer):**
- Customers
- Orders (draft and confirmed)
- Order line items
- Invoices
- User accounts
- Audit logs

**Critical Rule**: Backend MUST fetch menu data from Sanity API; it MAY cache but MUST NOT store authoritative copies in PostgreSQL.

**Correct Pattern:**
```python
# ✅ CORRECT: Fetch from Sanity, cache temporarily
# backend/src/services/menu.py
from sanity_client import client

async def get_menu_items():
    """Fetch menu items from Sanity CMS"""
    query = '*[_type == "menuItem" && available == true]'
    items = await client.fetch(query)
    # Optional: cache for 5 minutes to reduce API calls
    return items

async def create_order_with_items(order_data, item_ids):
    """Create order with current menu pricing"""
    # Fetch CURRENT prices from Sanity
    menu_items = await get_menu_items()

    # Build order with current prices (not stored prices)
    for item_id in item_ids:
        current_item = find_item(menu_items, item_id)
        # Store snapshot of price AT ORDER TIME
        order.add_line_item(
            item_id=item_id,
            name=current_item.name,
            price_at_order=current_item.price  # Snapshot
        )
```

**Anti-Pattern - Violation:**
```python
# ❌ WRONG: Duplicating menu data in PostgreSQL
# backend/src/models/menu_item.py
class MenuItem(SQLModel, table=True):
    """PROHIBITED: Menu items belong in Sanity, not PostgreSQL"""
    id: int
    name: str
    description: str
    price: Decimal  # This should come from Sanity!
```

**Price Snapshot Rule**: When an order is created, capture a SNAPSHOT of the item price at order time (for historical accuracy), but always fetch CURRENT prices from Sanity for new orders.

**Data Flow:**
```
Staff updates menu → Sanity CMS → Backend fetches → Frontend displays
Staff creates order → Frontend → Backend (fetch current Sanity prices) → PostgreSQL (store price snapshot)
```

### 3. Domain Boundaries

KN KITCHEN has the following domain boundaries. Each domain should have clear responsibilities and minimal coupling.

#### Domain: Order Management

**Entities**: Order, OrderLineItem, OrderStatus
**Responsibilities**:
- Create draft orders
- Add/remove/update line items
- Calculate order totals (subtotal, tax, total)
- Transition orders: draft → confirmed → billed → completed/cancelled
- Validate order state transitions

**Boundaries**:
- Order Management USES Customer domain (references customer)
- Order Management USES Menu domain (fetches item prices)
- Order Management PROVIDES data TO Billing domain

#### Domain: Customer Management

**Entities**: Customer, ContactInfo, BillingAddress
**Responsibilities**:
- Create/update customer records
- Store contact information
- Maintain billing addresses
- Track customer order history

**Boundaries**:
- Customer Management is INDEPENDENT (no dependencies)
- Customer Management PROVIDES data TO Order Management

#### Domain: Menu/Catalog

**Entities**: MenuItem (Sanity CMS)
**Responsibilities**:
- Manage menu items (Sanity Studio)
- Provide current pricing
- Define item categories
- Manage item availability

**Boundaries**:
- Menu domain is READ-ONLY from backend perspective
- Menu domain PROVIDES data TO Order Management
- Menu domain is managed externally (Sanity CMS)

#### Domain: Billing/Invoicing

**Entities**: Invoice, InvoiceLineItem, Payment
**Responsibilities**:
- Generate PDF invoices from confirmed orders
- Store invoice metadata
- Track invoice versions
- Record payment information

**Boundaries**:
- Billing USES Order Management (reads confirmed orders)
- Billing is INDEPENDENT once invoice created (immutable)
- Billing PROVIDES data TO Reporting

#### Domain: Reporting

**Entities**: SalesReport, OrderVolumeReport, CustomerReport
**Responsibilities**:
- Aggregate sales data
- Generate date-range reports
- Calculate customer lifetime value
- Identify popular menu items

**Boundaries**:
- Reporting USES Order Management (read-only)
- Reporting USES Billing (read-only)
- Reporting USES Customer Management (read-only)
- Reporting is READ-ONLY (no writes to other domains)

#### Domain: Authentication

**Entities**: User, Session
**Responsibilities**:
- User login/logout
- JWT token generation/validation
- Session management
- Password reset flows

**Boundaries**:
- Authentication is INDEPENDENT (foundation layer)
- Authentication PROVIDES user context TO all domains
- Authentication does NOT know about business entities

**Domain Interaction Rules:**
- Domains communicate via EXPLICIT interfaces (service layer)
- Domains MAY reference other domain entities by ID
- Domains MUST NOT directly modify other domain data
- Cross-domain operations go through service layer coordination

### 4. Avoiding Tight Coupling

**Coupling** is the degree of interdependence between components. Tight coupling makes changes expensive and risky.

#### Loose Coupling Strategies

**Strategy 1: Dependency Injection**

```python
# ✅ CORRECT: Inject dependencies
class OrderService:
    def __init__(self, db: Session, menu_service: MenuService):
        self.db = db
        self.menu_service = menu_service  # Injected, not hardcoded

    async def create_order(self, order_data):
        menu_items = await self.menu_service.get_items()
        # ... use injected dependencies

# Usage
order_service = OrderService(db=get_db(), menu_service=MenuService())
```

```python
# ❌ WRONG: Hardcoded dependencies
class OrderService:
    def __init__(self):
        self.menu_service = MenuService()  # Tight coupling!
```

**Strategy 2: Interface-Based Design**

```python
# ✅ CORRECT: Define interface, implement separately
from abc import ABC, abstractmethod

class MenuProvider(ABC):
    @abstractmethod
    async def get_items(self) -> List[MenuItem]:
        pass

class SanityMenuProvider(MenuProvider):
    async def get_items(self) -> List[MenuItem]:
        # Sanity-specific implementation
        pass

class OrderService:
    def __init__(self, menu_provider: MenuProvider):
        self.menu_provider = menu_provider  # Depends on interface, not implementation
```

**Strategy 3: Data Transfer Objects (DTOs)**

```python
# ✅ CORRECT: Use DTOs for API contracts
from pydantic import BaseModel

class CreateOrderDTO(BaseModel):
    """Public API contract - decoupled from internal model"""
    customer_id: int
    items: List[OrderItemDTO]
    delivery_date: date
    notes: Optional[str]

# Internal model can change without breaking API
class Order(SQLModel, table=True):
    """Internal representation - can evolve independently"""
    id: int
    customer_id: int
    # ... internal fields can change
```

```python
# ❌ WRONG: Exposing internal models directly
@router.post("/orders")
async def create_order(order: Order):  # Tight coupling to internal model
    # API contract tied to database schema - bad!
```

**Strategy 4: Event-Based Communication (Future)**

For future extensibility, consider event-based patterns:

```python
# Future pattern (not required initially)
class OrderConfirmedEvent:
    order_id: int
    confirmed_at: datetime

# Services listen for events instead of direct calls
class BillingService:
    def on_order_confirmed(self, event: OrderConfirmedEvent):
        # Generate invoice when order confirmed
        pass
```

#### Coupling Anti-Patterns to Avoid

**Anti-Pattern 1: Circular Dependencies**

```python
# ❌ WRONG: Circular dependency
# order_service.py
from billing_service import BillingService

class OrderService:
    def confirm_order(self):
        BillingService().create_invoice()

# billing_service.py
from order_service import OrderService  # Circular!

class BillingService:
    def create_invoice(self):
        OrderService().get_order()
```

**Solution**: Introduce a coordinator or shared interface.

**Anti-Pattern 2: God Objects**

```python
# ❌ WRONG: One class doing everything
class OrderManager:
    def create_order(self): pass
    def create_customer(self): pass
    def generate_invoice(self): pass
    def send_email(self): pass
    def calculate_taxes(self): pass
    # ... 50 more methods
```

**Solution**: Split into domain-specific services.

**Anti-Pattern 3: Database-Driven Coupling**

```python
# ❌ WRONG: Foreign keys creating tight coupling
class Order(SQLModel, table=True):
    id: int
    customer: Customer = Relationship()  # Direct object relationship
    invoice: Invoice = Relationship()    # Assumes invoice always exists

# Better: Use IDs and fetch when needed
class Order(SQLModel, table=True):
    id: int
    customer_id: int  # Loose coupling via ID
    # Fetch customer when needed, not always
```

**Anti-Pattern 4: Frontend-Backend Schema Coupling**

```typescript
// ❌ WRONG: Frontend duplicating backend types manually
// frontend/src/types/order.ts
interface Order {
  id: number;
  customerId: number;
  // If backend changes, frontend breaks silently
}
```

```typescript
// ✅ CORRECT: Generate types from OpenAPI schema
// Frontend types auto-generated from backend API spec
// Changes in backend automatically update frontend types
import { Order } from './generated/api-types';
```

## Architectural Decisions

### Technology Stack Coupling

The constitution defines an IMMUTABLE technology stack. This intentional coupling is acceptable because:

1. **Stability**: Stack changes are rare and require constitutional amendment
2. **Consistency**: All agents know exactly what technologies to use
3. **Integration**: Technologies are chosen for compatibility

**Immutable Stack:**
- Frontend: Next.js (App Router) + React + TypeScript + Tailwind
- Backend: FastAPI + SQLModel + Pydantic
- Database: Neon PostgreSQL
- Auth: Better Auth
- CMS: Sanity.io
- PDF: ReportLab/WeasyPrint

### Deployment Separation

Frontend and backend MUST be deployable independently:

```
Frontend:  Vercel (or similar)
Backend:   Render/Railway/Fly.io (separate from frontend)
Database:  Neon (managed PostgreSQL)
CMS:       Sanity.io (SaaS)
```

This allows:
- Independent scaling
- Independent deployment cycles
- Easier troubleshooting
- Technology replacement (if constitution amended)

## Architecture Validation Checklist

When designing or reviewing features, verify:

- [ ] **Frontend/Backend Separation**: Is frontend calling backend API (not database)?
- [ ] **No Business Logic in Frontend**: Are calculations/validations in backend?
- [ ] **CMS vs Transactional**: Is menu data in Sanity, orders in PostgreSQL?
- [ ] **Domain Boundaries**: Does each domain have clear responsibilities?
- [ ] **Loose Coupling**: Are dependencies injected or interface-based?
- [ ] **No Circular Dependencies**: Can components be tested independently?
- [ ] **API Contracts**: Are DTOs used instead of internal models?
- [ ] **Independent Deployment**: Can frontend/backend deploy separately?

## Examples by Feature

### Feature: Create New Order

**Correct Architecture:**

1. **Frontend** (Next.js):
   - Renders order form
   - Validates required fields (UX only)
   - Calls `POST /api/orders` with form data

2. **Backend** (FastAPI):
   - Receives CreateOrderDTO
   - Fetches current menu prices from Sanity
   - Validates customer exists in PostgreSQL
   - Calculates order total (business logic)
   - Creates Order record in PostgreSQL
   - Returns OrderDTO to frontend

3. **Data Layer**:
   - Sanity: Provides menu item prices
   - PostgreSQL: Stores Order with price snapshot

**Domain Boundaries:**
- Order Management: Orchestrates order creation
- Customer Management: Validates customer ID
- Menu: Provides current pricing
- No tight coupling: Each domain accessed via service interface

### Feature: Generate Invoice

**Correct Architecture:**

1. **Frontend** (Next.js):
   - User clicks "Generate Invoice" button
   - Calls `POST /api/invoices` with order_id

2. **Backend** (FastAPI):
   - Validates order is confirmed (not draft)
   - Fetches order details from PostgreSQL
   - Generates PDF using ReportLab
   - Stores Invoice record in PostgreSQL
   - Returns invoice metadata and PDF URL

3. **Data Layer**:
   - PostgreSQL: Reads Order, writes Invoice

**Domain Boundaries:**
- Billing: Orchestrates invoice generation
- Order Management: Provides order data (read-only)
- No coupling to Menu domain (prices already captured in Order)

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Technical Stack section)
- Spec-Driven Development: `.claude/skills/spec-driven-development.md`
- Architecture templates will be created in specs/<feature>/plan.md

---

**Remember**: Good architecture enables change. Tight coupling makes every change expensive and risky. Invest in proper separation now to enable fast, safe changes later.
