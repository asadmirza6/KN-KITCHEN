---
id: 003
title: Create System Architecture Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "architecture", "separation-of-concerns", "domain-driven-design"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/system-architecture.md
tests:
  - None
---

## Prompt

Create a skill named "System Architecture".

This skill includes:
- Frontend / Backend separation
- CMS vs transactional data separation
- Clear domain boundaries
- Avoiding tight coupling

Create at:
.claude/skills/system-architecture.md

## Response snapshot

Created mandatory System Architecture skill at `.claude/skills/system-architecture.md`.

The skill defines KN KITCHEN's three-tier architecture and establishes clear separation of concerns:

**Architecture Overview:**
```
Presentation Layer (Next.js App Router)
    ↓ HTTP/REST
Application Layer (FastAPI)
    ↓               ↓
Data Layer     Content Layer
(PostgreSQL)   (Sanity CMS)
```

**1. Frontend/Backend Separation:**
- Frontend: UI rendering, routing, calling backend API
- Backend: Business logic, validation, database operations, PDF generation
- Communication: HTTP API only (no shared code except type definitions)
- Prohibited: Frontend accessing database, frontend business logic, backend rendering UI

**2. CMS vs Transactional Data Separation:**
- Sanity CMS: Menu items, pricing, content, media (authoritative source)
- PostgreSQL: Orders, customers, invoices, user accounts (transactional data)
- Backend fetches menu data from Sanity API (may cache, must not duplicate)
- Price snapshots captured at order time for historical accuracy

**3. Domain Boundaries:**
- **Order Management**: Draft/confirmed orders, line items, state transitions
- **Customer Management**: Customer records, contact info, addresses
- **Menu/Catalog**: Menu items (read-only from backend, managed in Sanity)
- **Billing/Invoicing**: PDF generation, invoice metadata, payment tracking
- **Reporting**: Sales reports, analytics (read-only, no writes)
- **Authentication**: Login/logout, JWT, sessions (foundation layer)

**Domain Interaction Rules:**
- Communicate via explicit interfaces (service layer)
- Reference other domains by ID only
- No direct modification of other domain data
- Cross-domain operations coordinated through service layer

**4. Avoiding Tight Coupling:**

**Loose Coupling Strategies:**
- Dependency Injection: Inject dependencies, don't hardcode
- Interface-Based Design: Depend on abstractions, not implementations
- Data Transfer Objects (DTOs): API contracts decoupled from internal models
- Event-Based Communication: Future pattern for extensibility

**Anti-Patterns to Avoid:**
- Circular dependencies (A imports B, B imports A)
- God objects (one class doing everything)
- Database-driven coupling (excessive use of ORM relationships)
- Frontend-backend schema coupling (manually duplicated types)

**Deployment Separation:**
- Frontend: Vercel (independent deployment)
- Backend: Render/Railway/Fly.io (independent deployment)
- Database: Neon PostgreSQL (managed)
- CMS: Sanity.io (SaaS)

**Validation Checklist:**
- [ ] Frontend calls backend API (not database directly)
- [ ] No business logic in frontend
- [ ] Menu data in Sanity, transactional data in PostgreSQL
- [ ] Clear domain boundaries and responsibilities
- [ ] Dependencies injected or interface-based
- [ ] No circular dependencies
- [ ] DTOs for API contracts
- [ ] Independent deployment capability

The skill includes concrete examples for "Create Order" and "Generate Invoice" features showing correct architectural patterns.

## Outcome

- ✅ Impact: Established architectural guardrails preventing common design mistakes, ensuring proper separation of concerns across presentation/application/data layers
- 🧪 Tests: None (architectural guidance)
- 📁 Files: Created .claude/skills/system-architecture.md (428 lines)
- 🔁 Next prompts: Reference during /sp.plan for architectural decisions, validate domain boundaries in first feature specs
- 🧠 Reflection: Skill provides concrete examples and anti-patterns, helping agents understand not just what to do but why, and what mistakes to avoid

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first /sp.plan execution where domain boundaries are defined
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test architecture validation checklist during first feature planning phase
