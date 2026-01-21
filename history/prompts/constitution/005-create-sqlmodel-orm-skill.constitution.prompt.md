---
id: 005
title: Create SQLModel ORM Usage Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "sqlmodel", "orm", "database", "performance"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/sqlmodel-orm.md
tests:
  - None
---

## Prompt

Create a skill named "SQLModel ORM Usage".

Includes:
- Table relationships
- Indexing strategy
- Transaction safety
- Avoiding N+1 queries

Create at:
.claude/skills/sqlmodel-orm.md

## Response snapshot

Created mandatory SQLModel ORM Usage skill at `.claude/skills/sqlmodel-orm.md`.

The skill defines best practices for database operations in KN KITCHEN:

**Core Principles:**
1. Database Constraints First - Enforce business rules at database level
2. Explicit Relationships - Define foreign keys and relationships clearly
3. Index Strategically - Index for queries, not every column
4. Transaction Safety - ACID guarantees through proper session management
5. Eager Loading - Avoid N+1 queries with relationship loading strategies

**1. Table Relationships:**

**One-to-Many:**
- Customer has many Orders: `Customer.orders: List[Order]`
- Order has many OrderLineItems: `Order.line_items: List[OrderLineItem]`
- Use `Relationship(back_populates="...")` for bidirectional navigation

**Many-to-One:**
- Many Orders belong to one Customer: `Order.customer: Customer`
- Foreign key with `Field(foreign_key="customers.id")`

**Many-to-Many:**
- Explicit link table (e.g., `OrderTagLink`)
- Use `Relationship(link_model=OrderTagLink)`

**Loading Strategies:**
- Lazy loading (default): Load on access (N+1 risk)
- Eager loading with `selectinload()`: 2 queries (parent + children)
- Eager loading with `joinedload()`: 1 query with JOIN
- Nested loading: `selectinload(A.b).selectinload(B.c)`

**Cascade Behaviors:**
- `all, delete-orphan`: Delete children when parent deleted
- Use carefully: Don't cascade delete confirmed orders (violates constitution)
- Draft orders can cascade delete line items

**2. Indexing Strategy:**

**ALWAYS Index:**
- Primary keys (automatic)
- Foreign keys (relationships)
- Unique constraints (email, username)
- Frequently filtered columns (status, date ranges)
- Frequently sorted columns (ORDER BY)

**CONSIDER Indexing:**
- JOIN conditions
- WHERE clauses for common queries
- GROUP BY columns

**AVOID Indexing:**
- Low-cardinality columns (boolean, small enums)
- Frequently updated columns
- Small tables (<1000 rows)

**Composite Indexes:**
- Order matters: Index(A, B) helps (A) or (A, B), NOT (B)
- Most selective column first
- Exact match before range columns
- Example: `Index("ix_orders_customer_date", "customer_id", "created_at")`

**Partial Indexes (PostgreSQL):**
- Index subset: `postgresql_where=text("status = 'draft'")`

**3. Transaction Safety:**

**Session Management:**
- Use context manager for auto-commit/rollback
- Dependency injection pattern from FastAPI skill
- `session.commit()` on success, `session.rollback()` on exception

**Transaction Isolation Levels:**
- `READ COMMITTED`: Default for most operations
- `SERIALIZABLE`: Critical financial operations (invoice generation)

**Locking Strategies:**
- **Optimistic locking**: Version column, check before update (preferred)
- **Pessimistic locking**: `SELECT FOR UPDATE` for high-conflict operations
- Use for critical state transitions (draft → confirmed)

**Multi-Step Operations:**
- Wrap in single transaction for atomicity
- All changes commit together or all rollback

**4. Avoiding N+1 Queries:**

**Problem:**
- 1 query for parents + N queries for children (100 customers = 101 queries)

**Solutions:**

**selectinload():**
```python
.options(selectinload(Customer.orders))
# 2 queries: customers, then all orders with WHERE IN
```

**joinedload():**
```python
.options(joinedload(Customer.orders))
# 1 query: customers LEFT JOIN orders
```

**Nested Loading:**
```python
.options(selectinload(Customer.orders).selectinload(Order.line_items))
# 3 queries: customers, orders, line_items
```

**Manual Batching:**
- Load all parents, extract IDs, batch load children with WHERE IN
- Build lookup map for O(1) access

**Detection:**
- Enable SQLAlchemy query logging: `echo=True`
- Test query counts in unit tests
- Monitor in development

**Common Patterns:**

**Soft Delete:**
- `deleted_at: Optional[datetime]` column
- Filter queries: `WHERE deleted_at IS NULL`
- Preserve confirmed orders (constitution requirement)

**Audit Trail:**
- Separate audit log table
- Record state transitions (created, confirmed, cancelled)
- Track user, timestamp, old/new values

**Best Practices Checklist:**
- [ ] Relationships defined with foreign keys and `Relationship()`
- [ ] Strategic indexes on FK, unique, frequently-queried columns
- [ ] Composite indexes for multi-column queries
- [ ] Database constraints enforce business rules
- [ ] Multi-step operations in transactions
- [ ] Eager loading to avoid N+1 queries
- [ ] Careful cascade (only dependent data, not business entities)
- [ ] Session managed via dependency injection
- [ ] Locks justified (optimistic preferred)
- [ ] Queries tested for N+1 in development

## Outcome

- ✅ Impact: Established comprehensive database operation patterns ensuring data integrity, query performance, transaction safety, and proper relationship management
- 🧪 Tests: None (database guidelines)
- 📁 Files: Created .claude/skills/sqlmodel-orm.md (658 lines)
- 🔁 Next prompts: Reference during database model implementation, validate query performance in code reviews
- 🧠 Reflection: Skill provides detailed examples of relationship patterns, indexing strategies, transaction handling, and N+1 query prevention - critical for production database operations

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first database model implementation and query optimization reviews
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test eager loading patterns and index effectiveness during first feature implementation with database queries
