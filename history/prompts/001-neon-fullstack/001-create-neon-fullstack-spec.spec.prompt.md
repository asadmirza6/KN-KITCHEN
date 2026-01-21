---
id: 001
title: Create Neon Fullstack Spec
stage: spec
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: 001-neon-fullstack
branch: 001-neon-fullstack
user: system
command: /sp.specify
labels: ["spec", "neon-postgresql", "fullstack", "admin-panel", "migration"]
links:
  spec: specs/001-neon-fullstack/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-neon-fullstack/spec.md
  - specs/001-neon-fullstack/checklists/requirements.md
tests:
  - None
---

## Prompt

Transform the KN KITCHEN project into a full-stack web application using Neon PostgreSQL as the only persistent data source. Sanity.io is removed completely. Backend and frontend must work with Neon DB for all content, images, orders, and gallery items. The system must support admin-managed content (banners, items, gallery images) via frontend without direct DB access.

**Scope:**
1. Backend (FastAPI + SQLModel) with Neon PostgreSQL connection, tables (users, orders, items, media_assets), Better Auth with JWT, middleware for verification, REST APIs for CRUD, file upload endpoints, and auto-save orders
2. Frontend (Next.js 16+ App Router) with responsive navbar, hero slider fetching banners from Neon DB, gallery section, admin panel (add items, upload gallery images, change banners, generate orders), TailwindCSS styling, consuming FastAPI endpoints
3. Media management with images in `/uploads` folder, URLs in Neon DB, automatic reflection of DB changes on frontend
4. Environment variables for DATABASE_URL, BETTER_AUTH_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS

## Response snapshot

Created comprehensive feature specification at `specs/001-neon-fullstack/spec.md` with complete user scenarios, requirements, and success criteria.

**Specification includes:**

1. **6 Prioritized User Stories** (P1-P4):
   - P1: Customer views public website (homepage, banners, gallery, menu items)
   - P2: Admin authentication and access (login, logout, JWT)
   - P3: Admin manages menu items (add, edit, delete with images)
   - P3: Admin manages gallery images (upload, delete)
   - P3: Admin changes banners (upload, activate/deactivate)
   - P4: Admin generates orders (create with items, totals, advance payment)

2. **33 Functional Requirements** (FR-001 to FR-033):
   - Authentication & Authorization (FR-001 to FR-005): Signup, login with Better Auth, JWT verification, admin panel protection, logout
   - Backend API (FR-006 to FR-013): Neon PostgreSQL connection, SQLModel models, CRUD endpoints, file uploads, fetch active banners/gallery, auto-save orders
   - Frontend (FR-014 to FR-023): Responsive navbar, banner slider, gallery, admin panel (add items, upload images, change banners, create orders), TailwindCSS, consume FastAPI endpoints
   - Database Schema (FR-024 to FR-028): users, orders, items, media_assets tables with specified columns, Alembic migrations
   - Media Management (FR-029 to FR-033): Accept JPEG/PNG/GIF/WebP, reject non-images, unique filenames in `/uploads`, store URLs in Neon DB, automatic reflection

3. **4 Key Entities**: User (admins), Order (with items JSON, totals, payments), Item (menu items with price_per_kg), MediaAsset (banners/gallery with is_active flag)

4. **10 Measurable Success Criteria** (SC-001 to SC-010):
   - Homepage loads in under 3 seconds
   - Admin login under 30 seconds
   - Add menu item under 2 minutes
   - Handle 100 concurrent visitors
   - Images appear within 5 seconds
   - 95% upload success rate
   - 100% data integrity for orders
   - Responsive on 320px+ screens
   - Admin panel inaccessible to unauthenticated users
   - API response under 500ms

5. **10 Assumptions**: Single admin role (no RBAC), order items as JSON, no customer portal, local image storage, auto-save only, no email verification, basic banner slider, no image resizing, PostgreSQL only, environment variables

6. **12 Out of Scope Items**: Sanity.io integration, customer self-service, payment processing, inventory management, email notifications, advanced reporting, multi-tenancy, API rate limiting, image optimization, audit logs, search functionality, mobile apps

7. **8 Dependencies**: Neon PostgreSQL, Better Auth, Next.js 16+, FastAPI, SQLModel, TailwindCSS, file upload library, image validation library

8. **Edge Cases Covered**: Large uploads, concurrent admin actions, price updates during order creation, deleted items in historical orders, JWT expiration, upload failures, concurrent banner updates, malicious file uploads

**Requirements Checklist Results**:
- ✅ All mandatory sections completed
- ✅ No implementation details in requirements
- ✅ Focused on user value
- ✅ No [NEEDS CLARIFICATION] markers
- ✅ Requirements testable and unambiguous
- ✅ Success criteria measurable and technology-agnostic
- ✅ Acceptance scenarios defined for all user stories
- ✅ Edge cases identified
- ✅ Scope clearly bounded
- ✅ Dependencies and assumptions documented

**Branch Created**: `001-neon-fullstack`
**Specification Path**: `specs/001-neon-fullstack/spec.md`
**Checklist Path**: `specs/001-neon-fullstack/checklists/requirements.md`

## Outcome

- ✅ Impact: Created complete feature specification for transforming KN KITCHEN to full-stack Neon PostgreSQL application, removing Sanity.io dependency entirely, with 33 functional requirements, 6 user stories, and 10 measurable success criteria
- 🧪 Tests: None (specification phase)
- 📁 Files: Created specs/001-neon-fullstack/spec.md (315 lines), specs/001-neon-fullstack/checklists/requirements.md (validation checklist)
- 🔁 Next prompts: Run `/sp.plan` to create implementation plan based on this specification
- 🧠 Reflection: Specification makes informed assumptions for underspecified details (JWT expiration, image size limits, banner rotation timing) to avoid excessive clarifications while documenting all assumptions for transparency. Complete migration from Sanity.io to Neon DB with admin panel for content management represents significant architectural shift.

## Evaluation notes (flywheel)

- Failure modes observed: None (initial specification creation)
- Graders run and results (PASS/FAIL): Requirements checklist validates all quality criteria passed
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Proceed to `/sp.plan` to create implementation plan with database models, API endpoints, and frontend components
