
---
id: 001
title: Create KN KITCHEN Constitution
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: /sp.constitution
labels: ["constitution", "governance", "project-setup", "kn-kitchen"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - None
---

## Prompt

You are writing the single, permanent constitution for a production web application named "KN KITCHEN".

This is NOT a hackathon project.
This is a real business system for a catering kitchen.

The constitution must define:
- Project purpose and scope
- What problems this system solves
- Explicit non-goals (what this system will never try to do)
- Core domain concepts (Orders, Customers, Items, Draft Orders, Billing)
- Technical stack (Next.js App Router, FastAPI, SQLModel, Neon PostgreSQL, Better Auth, Sanity.io)
- Authentication and authorization rules (JWT, user isolation)
- Data ownership and persistence rules
- Draft vs Confirmed order rules
- PDF billing rules
- Reporting expectations
- Security and data integrity rules
- What Claude must NEVER change without updating specs

Rules:
- Write in clear, strict, authoritative language
- This constitution must be followed by all future specs, plans, tasks, and agents
- Do not include implementation code
- This document is written once and rarely changed

Output:
A single structured constitution document.

## Response snapshot

Created comprehensive KN KITCHEN Constitution v1.0.0 at `.specify/memory/constitution.md`.

The constitution establishes:

**7 Core Principles:**
1. Data Integrity is Non-Negotiable - Financial and customer data protection with immutable state transitions
2. User Isolation and Authorization - JWT-based auth required on all routes
3. Draft vs Confirmed Order Separation - Clear state machine with explicit transitions
4. Single Source of Truth for Content - Sanity.io CMS as authoritative source for menu data
5. Billing Immutability - Generated invoices are legal documents, never retroactively modified
6. Test Coverage for Business Logic - Automated tests required for all money-handling code
7. Simplicity and Maintainability - Explicit code over clever abstractions

**Technical Stack (Immutable):**
- Frontend: Next.js 14+ App Router, React 18+, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLModel, Pydantic
- Database: Neon PostgreSQL
- Auth: Better Auth (JWT)
- CMS: Sanity.io
- PDF: Server-side generation (ReportLab/WeasyPrint)

**Domain Concepts:** Customer, Item, Order, Draft Order, Confirmed Order, Invoice/Billing

**Explicit Non-Goals:** Kitchen scheduling, inventory, POS hardware, multi-location, mobile apps, third-party marketplace integrations, customer self-service

**Security Rules:** Authentication required, input validation at API boundaries, no SQL injection, no secrets in code, HTTPS only, audit logging

**Governance:** Constitutional amendments require proposal, review, semantic versioning, template propagation, and ADR documentation for significant changes.

## Outcome

- ✅ Impact: Established foundational governance document for production catering system, defining scope boundaries, technical constraints, and non-negotiable principles
- 🧪 Tests: None (documentation task)
- 📁 Files: Created .specify/memory/constitution.md (v1.0.0, 205 lines)
- 🔁 Next prompts: /sp.specify for first feature, verify template alignment during first /sp.plan execution
- 🧠 Reflection: Constitution clearly separates production requirements from hackathon-style development, establishes immutable technical stack, and explicitly marks out-of-scope features to prevent scope creep

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Manual review required - templates marked for verification on first use
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Validate constitution gates during first /sp.plan execution, verify principle enforcement
