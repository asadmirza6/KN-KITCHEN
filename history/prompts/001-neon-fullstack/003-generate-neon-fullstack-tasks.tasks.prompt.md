---
id: 003
title: Generate Neon Fullstack Tasks
stage: tasks
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: 001-neon-fullstack
branch: 001-neon-fullstack
user: system
command: /sp.tasks
labels: ["tasks", "neon-postgresql", "fullstack", "user-stories", "task-breakdown"]
links:
  spec: specs/001-neon-fullstack/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-neon-fullstack/tasks.md
tests:
  - None
---

## Prompt

Context for task generation: (empty)

The /sp.tasks command was invoked to generate a comprehensive task breakdown for the Neon PostgreSQL full-stack application based on the approved specification and implementation plan.

**Requirements**:
- Organize tasks by user story (6 user stories from spec.md)
- Use strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- Map plan phases (0-6) to user stories (US1-US6)
- Each user story should be independently implementable and testable
- Include setup, foundational, and polish phases
- Specify exact file paths from plan.md structure (backend/src/, frontend/src/)
- Mark parallelizable tasks with [P]
- Create dependency graph showing story completion order
- Provide parallel execution examples
- Generate MVP scope recommendation

## Response snapshot

Created comprehensive tasks.md at `specs/001-neon-fullstack/tasks.md` with 132 tasks organized by 6 user stories.

**Task Organization**:

1. **Phase 1: Setup** (10 tasks: T001-T010)
   - Initialize backend/frontend projects
   - Install dependencies (FastAPI, SQLModel, Next.js 16+, TailwindCSS)
   - Create environment variable templates
   - Verify Neon PostgreSQL connectivity

2. **Phase 2: Foundational** (14 tasks: T011-T024) - BLOCKS all user stories
   - Create SQLModel models (User, Order, Item, MediaAsset)
   - Initialize Alembic migrations
   - Create database tables in Neon DB
   - Create TypeScript interfaces
   - Setup Axios client with JWT interceptor

3. **Phase 3: US2 - Admin Authentication (P2)** (13 tasks: T025-T037)
   - Implement JWT token generation and verification middleware
   - Create signup/login endpoints in backend/src/api/auth.py
   - Create login page in frontend/src/app/login/page.tsx
   - Store JWT in localStorage, add to request headers

4. **Phase 4: US1 - Public Website (P1)** 🎯 MVP (14 tasks: T038-T051)
   - Create Navbar component with Login/Logout buttons
   - Build BannerSlider with Swiper library (auto-rotate 5s)
   - Build Gallery grid (responsive 3-4 columns desktop, 1-2 mobile)
   - Build MenuItems list with prices from backend
   - Fetch data from GET /media and GET /items endpoints

5. **Phase 5: US3 - Admin Manages Menu Items (P3)** (17 tasks: T052-T068)
   - Implement Items CRUD API (POST/PATCH/DELETE /items)
   - Image validation (JPEG/PNG/GIF/WebP, <10MB)
   - Save images to backend/uploads/, serve as static files
   - Create admin/items management page with add/edit/delete forms

6. **Phase 6: US4 - Admin Manages Gallery (P3)** (13 tasks: T069-T081)
   - Implement Media upload API (POST /media/upload with type='gallery')
   - Create toggle active endpoint (PATCH /media/{id}/toggle-active)
   - Create admin/gallery management page with upload form

7. **Phase 7: US5 - Admin Changes Banners (P3)** (9 tasks: T082-T090)
   - Reuse Media upload API with type='banner'
   - Create admin/banners management page with toggle active

8. **Phase 8: US6 - Admin Generates Order (P4)** (16 tasks: T091-T106)
   - Implement Orders API (POST /orders with price calculation)
   - Create order form with item selector, quantity inputs
   - Real-time total/balance calculation
   - Orders list table with View Details

9. **Phase 9: Polish & Testing** (26 tasks: T107-T132)
   - Backend pytest tests (auth, items, media, orders) - >80% coverage
   - Frontend Jest tests (Navbar, BannerSlider, AdminForm)
   - Manual testing against 10 success criteria (SC-001 to SC-010)
   - Deployment preparation (CORS, HTTPS, env templates)

**Task Format Compliance**:
- ✅ All 132 tasks use checkbox format: `- [ ] [TaskID] [P?] [Story?] Description`
- ✅ Sequential Task IDs: T001-T132
- ✅ 62 tasks marked [P] for parallel execution
- ✅ All user story tasks labeled [US1]-[US6]
- ✅ Exact file paths specified (backend/src/api/auth.py, frontend/src/components/Navbar.tsx, etc.)

**Dependencies Documented**:
- Setup (Phase 1) → No dependencies
- Foundational (Phase 2) → Depends on Setup, BLOCKS all user stories
- US2 (Admin Auth) → Depends on Foundational, BLOCKS US3-US6 (admin features require auth)
- US1 (Public Website) → Depends on Foundational, INDEPENDENT (public endpoints don't require auth)
- US3 (Menu Items) → Depends on US2, can run parallel with US4, US5
- US4 (Gallery) → Depends on US2, can run parallel with US3, US5
- US5 (Banners) → Depends on US2, can run parallel with US3, US4
- US6 (Orders) → Depends on US2 + US3 (needs items table)

**Parallel Execution Examples**:
- Setup phase: T003-T007 (env files, configs)
- Foundational: T012-T014 (models), T020-T023 (TypeScript types)
- US1: T038-T039, T041, T043, T045-T049 (components and services)
- US3: T052-T056 (backend CRUD), T060, T063-T064 (frontend pages)
- Testing: T107-T110 (backend), T112-T114 (frontend), T116-T125 (manual) - all parallel

**MVP Scope**: 51 tasks (T001-T051)
- Phases: Setup + Foundational + US2 (Admin Auth) + US1 (Public Website)
- Delivers: Public website displaying banners/gallery/menu + admin login system
- Value: Customers browse offerings, admins authenticate
- Next increment: Add US3 (Menu Items) for content management

**Independent Test Criteria**:
- US1: Navigate to homepage → verify banners/gallery/menu display → test responsive 320px
- US2: Signup → login → receive JWT → access /admin panel
- US3: Login → add item with image → verify on public website
- US4: Login → upload gallery image → toggle active → verify on gallery
- US5: Login → upload banner → activate → verify in homepage slider
- US6: Login → create order with items → verify total/balance calculated → verify in DB

## Outcome

- ✅ Impact: Created comprehensive task breakdown with 132 tasks organized by 6 user stories, enabling independent implementation and testing. Each user story has clear goal, independent test criteria, and exact file paths. 62 tasks parallelizable for team efficiency.
- 🧪 Tests: Testing tasks in Phase 9 (T107-T132) - NOT TDD approach per spec assumption
- 📁 Files: Created specs/001-neon-fullstack/tasks.md (552 lines)
- 🔁 Next prompts: Execute Phase 1 (Setup) tasks T001-T010 to initialize backend/frontend projects, then Phase 2 (Foundational) T011-T024 to create database schema before starting user story implementation
- 🧠 Reflection: Task organization by user story enables MVP-first delivery strategy (US1+US2 = 51 tasks for functional public website + admin auth). US2 (Admin Auth) correctly identified as blocker for US3-US6 but NOT US1 (public endpoints). Parallel opportunities maximize team efficiency (62 tasks marked [P]). Dependency graph shows US3, US4, US5 can run in parallel after US2 completes. All 10 success criteria mapped to manual test tasks (T116-T125).

## Evaluation notes (flywheel)

- Failure modes observed: None (successful task generation)
- Graders run and results (PASS/FAIL): Task format validation PASS - all 132 tasks use required checkbox format with IDs, [P] markers, [Story] labels, and file paths
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Begin implementation with Phase 1 (Setup) - execute T001-T010 to verify task granularity and clarity are sufficient for autonomous LLM execution
