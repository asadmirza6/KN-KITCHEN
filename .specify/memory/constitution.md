# KN KITCHEN Constitution

<!--
Sync Impact Report (2026-01-16):
Version change: 1.0.0 → 2.0.0 (MAJOR)
Changes:
  - CONSTITUTIONAL AMENDMENT: Principle IV replaced - removed Sanity.io CMS dependency
  - Single source of truth migrated from Sanity.io to Neon PostgreSQL database
  - Content management now via admin panel (web UI) instead of external CMS
  - Technical stack updated: removed Sanity.io from content management
  - Item domain concept updated: managed in Neon DB instead of Sanity CMS
  - Rationale: Consolidates data storage, eliminates external dependency, reduces operational costs
  - Migration required: Existing Sanity.io content must be manually migrated to Neon DB
Templates requiring updates:
  ✅ .specify/memory/constitution.md (this file)
  ⚠ Pending: Verify alignment with plan-template.md, spec-template.md, tasks-template.md
Follow-up TODOs: Create ADR documenting Sanity.io → Neon DB migration decision
-->

## Project Purpose and Scope

**KN KITCHEN** is a production catering kitchen order management system designed to solve real business problems for a commercial catering operation. This is NOT a prototype, hackathon project, or proof-of-concept. It is a business-critical system handling money, customer data, and operational workflows.

### Problems This System Solves

1. **Order Management**: Capture, track, and fulfill customer catering orders from inquiry through delivery
2. **Draft Order Workflow**: Allow staff to work on incomplete orders before customer confirmation
3. **Customer Relationship Management**: Maintain customer profiles, order history, and billing records
4. **Item Catalog Management**: Manage menu items, pricing, and availability through content management
5. **Billing and Invoicing**: Generate accurate PDF invoices with line-item detail and totals
6. **Reporting**: Provide visibility into sales, order volume, customer activity, and revenue

### Explicit Non-Goals

The following are PERMANENTLY OUT OF SCOPE. Any feature requests in these areas MUST be rejected without updating this constitution:

- Real-time kitchen production scheduling or workflow management
- Inventory tracking, ingredient management, or supply chain
- Employee time tracking, payroll, or HR functions
- Point-of-sale (POS) hardware integration or cash register functionality
- Multi-location, franchise, or white-label support
- Mobile native applications (iOS/Android apps)
- Third-party marketplace integrations (UberEats, DoorDash, etc.)
- Customer-facing self-service ordering portal (staff-only system)

## Core Principles

### I. Data Integrity is Non-Negotiable

Financial data, customer information, and confirmed orders MUST be protected from corruption, loss, or unauthorized modification. All order state transitions (draft → confirmed → billed) are irreversible without explicit audit trail. Database constraints (foreign keys, NOT NULL, CHECK) MUST enforce business rules at the persistence layer. Application code MAY NOT bypass these constraints.

**Rationale**: This is a money-handling system. A corrupted order or lost invoice damages customer trust and business revenue.

### II. User Isolation and Authorization

Every data operation MUST verify the authenticated user has authorization to perform that operation. User sessions are JWT-based. Multi-tenancy is NOT supported; all users belong to a single organization. Row-level permissions are NOT required (all staff see all orders), but authentication MUST be enforced on every API route and page.

**Rationale**: Unauthenticated access to customer data or financial records is a critical security failure. Staff must be logged in to use the system.

### III. Draft vs Confirmed Order Separation

Orders exist in two states: **Draft** (incomplete, editable, no billing) and **Confirmed** (locked, immutable except by explicit edit with audit, eligible for billing).

- Draft orders MAY be modified freely, deleted, or abandoned
- Confirmed orders MUST NOT be deleted; they may only be marked cancelled or refunded with justification
- Only confirmed orders appear in billing and reporting
- Transition from draft → confirmed requires explicit user action and validation (customer, items, pricing)

**Rationale**: Staff need flexibility to work on incomplete orders, but confirmed orders represent legal and financial commitments.

### IV. Single Source of Truth for Content

Menu items, pricing, descriptions, media assets, and availability are managed exclusively in **Neon PostgreSQL database**. The application backend provides admin APIs for CRUD operations; the frontend admin panel allows staff to manage content without direct database access.

**Rationale**: Consolidates data storage to single persistent layer (Neon DB), eliminates dependency on external CMS, allows admin staff to manage content via web UI without Sanity.io account costs. Non-technical staff use the admin panel for menu management without requiring database credentials or technical knowledge.

### V. Billing Immutability

Once a PDF invoice is generated and associated with an order, that invoice MUST be preserved exactly as generated. If an order is modified post-billing, a NEW invoice version is generated; the old version remains accessible for audit purposes. Invoice generation MUST include: order number, date, customer details, line items with quantities and prices, subtotal, tax, total, payment terms.

**Rationale**: Invoices are legal documents. Retroactive modification creates compliance and trust issues.

### VI. Test Coverage for Business Logic

All business-critical logic (order validation, pricing calculation, state transitions, billing) MUST have automated test coverage before merging to production. Tests MUST cover:

- Happy path (valid order creation, confirmation, billing)
- Edge cases (empty orders, zero-price items, negative quantities)
- Error paths (missing customer, invalid items, unauthorized access)
- State transition violations (billing a draft, deleting a confirmed order)

**Rationale**: Manual testing is insufficient for a production system handling money. Regressions in order or billing logic have immediate business impact.

### VII. Simplicity and Maintainability

Prefer simple, explicit, readable code over clever abstractions. Avoid premature optimization, over-engineering, or speculative generality. Use standard patterns from the chosen stack (Next.js App Router conventions, FastAPI dependency injection, SQLModel ORM). Do NOT introduce new frameworks, ORMs, or architectural patterns without updating this constitution and documenting the decision in an ADR.

**Rationale**: This system will be maintained over years, possibly by developers unfamiliar with the original implementation. Clarity trumps cleverness.

## Technical Stack (Immutable Without Constitutional Amendment)

The following technologies are the PERMANENT foundation of KN KITCHEN. Changing any of these requires a constitutional amendment with full migration plan and ADR.

- **Frontend**: Next.js 16+ (App Router), React 18+, TypeScript, Tailwind CSS
- **Backend API**: FastAPI (Python 3.11+), SQLModel (ORM), Pydantic (validation)
- **Database**: Neon PostgreSQL (managed, serverless Postgres) - single source of truth for all data
- **Authentication**: Better Auth (JWT-based session management)
- **Content Management**: Admin panel (web UI) with backend APIs - no external CMS
- **PDF Generation**: Server-side library compatible with FastAPI (e.g., ReportLab, WeasyPrint)
- **Deployment**: Vercel (frontend), Render/Railway/Fly.io (backend), Neon (database)

## Core Domain Concepts

### Customer

A business or individual who places catering orders. Attributes: name, contact info, billing address, order history. Customers are NOT user accounts; they are data entities managed by staff.

### Item

A menu item available for catering orders. Managed in Neon PostgreSQL database via admin panel. Attributes: name, description, price_per_kg, category, availability, image_url. Staff manage items through the admin panel web UI.

### Order

A request for catering service. Two states: Draft (in-progress) and Confirmed (committed). Attributes: customer reference, line items (item + quantity), subtotal, tax, total, delivery date, status, notes.

### Draft Order

An order in progress. Editable, deletable, not billed. Staff can add/remove items, change quantities, modify customer, save and return later.

### Confirmed Order

An order that has been validated and committed. Immutable (except explicit edits with audit log). Eligible for billing and reporting. Cannot be deleted, only cancelled with reason.

### Invoice (Billing)

A PDF document generated from a confirmed order. Contains itemized charges, totals, payment terms. Once generated, the PDF is immutable. New invoice versions may be created if order is modified post-billing.

## Security and Data Integrity Rules

1. **Authentication Required**: Every HTTP endpoint (API and page) MUST enforce authentication except public health checks and login routes.

2. **Input Validation**: All user input MUST be validated at API boundaries using Pydantic models. Never trust client-side validation alone.

3. **SQL Injection Prevention**: Use SQLModel ORM for all database access. Raw SQL is PROHIBITED except in read-only analytics queries reviewed for injection risk.

4. **No Secrets in Code**: API keys, database credentials, JWT secrets MUST be stored in environment variables, never committed to Git.

5. **HTTPS Only**: All production traffic MUST use HTTPS. HTTP is acceptable only in local development.

6. **Audit Logging**: Changes to confirmed orders, invoice generation, and user authentication events MUST be logged with timestamp, user, and action.

## Reporting Expectations

The system MUST provide the following reports to staff:

- **Sales Report**: Total revenue by date range, grouped by day/week/month
- **Order Volume**: Count of orders by status, date range
- **Customer Report**: Order history and total spend per customer
- **Item Popularity**: Most frequently ordered items by quantity and revenue

Reports MAY be generated on-demand (no scheduling required). Report data MUST match billing records exactly (no discrepancies between reported revenue and invoiced totals).

## What Claude Must NEVER Change Without Updating Specs

The following changes are PROHIBITED without explicit user approval and corresponding spec/plan/ADR documentation:

1. Changing the technical stack (framework, database, auth provider, content management approach)
2. Modifying order state machine (adding states, changing transitions)
3. Changing billing immutability rules or invoice versioning
4. Adding multi-tenancy, role-based access control, or row-level security
5. Integrating third-party services not listed in this constitution
6. Relaxing authentication requirements or input validation
7. Introducing background jobs, queues, or async processing without architectural justification
8. Changing deployment targets or infrastructure providers

## Development Workflow

1. **Spec First**: All features require a spec.md before implementation.
2. **Plan Before Code**: Architectural decisions require plan.md reviewed by user.
3. **Test-Driven**: Business logic MUST have tests written and approved before implementation.
4. **Small Diffs**: Keep changes focused, reviewable, and incremental. Large refactors require explicit approval.
5. **No Unrelated Edits**: Do not refactor code outside the scope of the current task.

## Governance

This constitution supersedes all other practices, conventions, or preferences. It may only be amended through the following process:

1. **Proposal**: Document the proposed change with rationale and impact analysis
2. **Review**: User reviews and approves or rejects the amendment
3. **Version Bump**: Update CONSTITUTION_VERSION according to semantic versioning:
   - **MAJOR**: Backward-incompatible principle removal or redefinition
   - **MINOR**: New principle or materially expanded section
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements
4. **Propagation**: Update dependent templates (plan-template.md, spec-template.md, tasks-template.md) to reflect changes
5. **Documentation**: Create an ADR documenting the constitutional amendment if architecturally significant

### Compliance and Enforcement

- All specs, plans, and tasks MUST verify alignment with this constitution
- Any AI agent working on this project MUST read and follow this constitution
- Code reviews MUST verify compliance with core principles
- Complexity or deviations MUST be justified with explicit rationale and user approval

### Runtime Guidance

For day-to-day development guidance, prompts, and agent-specific instructions, refer to `CLAUDE.md` (agent runtime rules). This constitution defines **what** the system is and **what** it must never violate; `CLAUDE.md` defines **how** agents should operate when building it.

**Version**: 2.0.0 | **Ratified**: 2026-01-16 | **Last Amended**: 2026-01-16 | **Amendment**: Principle IV - Sanity.io → Neon DB migration
