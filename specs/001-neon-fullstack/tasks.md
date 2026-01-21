---
description: "Task list for Neon PostgreSQL Full-Stack Application"
---

# Tasks: Neon PostgreSQL Full-Stack Application

**Input**: Design documents from `specs/001-neon-fullstack/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Test tasks are included in Phase 9 (not TDD approach - tests written after implementation per spec assumption)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` (as defined in plan.md)
- Backend: FastAPI with SQLModel, Better Auth, Neon PostgreSQL
- Frontend: Next.js 16+ App Router with TailwindCSS

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure from Phase 0 of implementation plan

- [ ] T001 Create `backend/` directory and initialize Python virtual environment with Python 3.11+
- [ ] T002 Install backend dependencies in backend/requirements.txt: fastapi, sqlmodel, uvicorn, python-multipart, pillow, alembic, python-jose[cryptography], passlib[bcrypt], psycopg2-binary
- [ ] T003 [P] Create backend/.env.example with placeholders: DATABASE_URL, BETTER_AUTH_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS
- [ ] T004 [P] Create backend/src/config.py to load environment variables using pydantic BaseSettings
- [ ] T005 Create `frontend/` directory with Next.js 16+ App Router: npx create-next-app@latest frontend --typescript --tailwind --app
- [ ] T006 Install frontend dependencies in frontend/: axios, react-hook-form, zod, @heroicons/react, swiper (for banner slider)
- [ ] T007 [P] Create frontend/.env.local.example with placeholder: NEXT_PUBLIC_API_URL
- [ ] T008 Create backend/src/database.py with SQLModel engine and session factory using Neon connection string with SSL mode
- [ ] T009 Create basic health check endpoint GET /health in backend/src/main.py returning database connection status
- [ ] T010 Test Neon PostgreSQL connectivity by running uvicorn and calling /health endpoint

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented (Phase 1 from implementation plan)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T011 Create backend/src/models/user.py with User SQLModel: id (primary key), name, email (unique), password_hash, created_at
- [ ] T012 [P] Create backend/src/models/order.py with Order SQLModel: id, user_id (FK), items (JSON), total_amount (Decimal), advance_payment (Decimal), balance (Decimal), created_at
- [ ] T013 [P] Create backend/src/models/item.py with Item SQLModel: id, name, price_per_kg (Decimal), image_url, created_at
- [ ] T014 [P] Create backend/src/models/media_asset.py with MediaAsset SQLModel: id, type (Enum 'banner'/'gallery'/'item'), title, image_url, is_active (Boolean), created_at
- [ ] T015 Initialize Alembic in backend/: alembic init alembic
- [ ] T016 Create initial Alembic migration script for all tables (users, orders, items, media_assets)
- [ ] T017 Run Alembic migration: alembic upgrade head to create tables in Neon DB
- [ ] T018 Verify tables exist in Neon DB using Neon SQL editor or psql client
- [ ] T019 Create backend/uploads/ directory for local image storage
- [ ] T020 [P] Create frontend/src/types/User.ts TypeScript interface matching User model
- [ ] T021 [P] Create frontend/src/types/Order.ts TypeScript interface matching Order model
- [ ] T022 [P] Create frontend/src/types/Item.ts TypeScript interface matching Item model
- [ ] T023 [P] Create frontend/src/types/MediaAsset.ts TypeScript interface matching MediaAsset model
- [ ] T024 Create frontend/src/lib/axios.ts with Axios instance configured with base URL and JWT interceptor

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 2 - Admin Authentication and Access (Priority: P2)

**Goal**: Allow administrators to log in with JWT tokens and protect admin panel routes

**Independent Test**: Create admin user via signup, login to receive JWT token, verify token grants access to admin panel and API endpoints

### Implementation for User Story 2

- [ ] T025 [P] [US2] Create backend/src/middleware/auth.py with verify_jwt dependency function
- [ ] T026 [P] [US2] Implement JWT token generation in backend/src/middleware/auth.py using python-jose with 7-day expiration
- [ ] T027 [US2] Create backend/src/api/auth.py router with POST /auth/signup endpoint
- [ ] T028 [US2] Implement signup logic: validate email format, hash password with passlib bcrypt, save User to Neon DB
- [ ] T029 [US2] Create POST /auth/login endpoint in backend/src/api/auth.py
- [ ] T030 [US2] Implement login logic: verify email/password, generate JWT token (payload: user_id, email, exp), return token
- [ ] T031 [US2] Mount auth router in backend/src/main.py at /auth prefix
- [ ] T032 [US2] Test signup and login endpoints manually with curl or Postman, verify JWT token returned
- [ ] T033 [P] [US2] Create frontend/src/services/authService.ts with signup, login, logout functions using Axios
- [ ] T034 [US2] Create frontend/src/app/login/page.tsx with login form (email, password inputs)
- [ ] T035 [US2] Implement login form submission: call authService.login, store JWT token in localStorage, redirect to /admin
- [ ] T036 [US2] Create logout functionality: remove JWT token from localStorage, redirect to homepage
- [ ] T037 [US2] Update frontend/src/lib/axios.ts to include JWT token from localStorage in Authorization header for all requests

**Checkpoint**: At this point, User Story 2 should be fully functional - admin can signup, login, receive JWT token

---

## Phase 4: User Story 1 - Customer Views Public Website (Priority: P1) 🎯 MVP

**Goal**: Public-facing website showing banners, gallery, and menu items fetched from Neon DB

**Independent Test**: Navigate to homepage, verify auto-rotating banner slider appears, gallery images display, menu items list shows with prices, responsive on 320px+ screens

### Implementation for User Story 1

- [ ] T038 [P] [US1] Create frontend/src/components/Navbar.tsx with TailwindCSS: logo (left), nav links (center: HOME, ABOUT, GALLERY, CONTACT, FEEDBACK), Login/Logout button (right)
- [ ] T039 [P] [US1] Implement Navbar authentication state: show Login button if no JWT token, show user name + Logout button if authenticated
- [ ] T040 [US1] Create frontend/src/app/layout.tsx root layout importing Navbar component
- [ ] T041 [P] [US1] Create backend GET /media endpoint in backend/src/api/media.py with query param ?type=banner|gallery, filter by is_active=true
- [ ] T042 [US1] Mount media router in backend/src/main.py at /media prefix
- [ ] T043 [P] [US1] Create backend GET /items endpoint in backend/src/api/items.py returning all items from items table
- [ ] T044 [US1] Mount items router in backend/src/main.py at /items prefix
- [ ] T045 [P] [US1] Create frontend/src/services/mediaService.ts with fetchBanners() and fetchGallery() functions
- [ ] T046 [P] [US1] Create frontend/src/services/itemsService.ts with fetchItems() function
- [ ] T047 [P] [US1] Create frontend/src/components/BannerSlider.tsx using Swiper library, fetch banners via mediaService, auto-rotate every 5 seconds
- [ ] T048 [P] [US1] Create frontend/src/components/Gallery.tsx with responsive grid (3-4 columns desktop, 1-2 mobile), fetch gallery images via mediaService
- [ ] T049 [P] [US1] Create frontend/src/components/MenuItems.tsx with responsive grid displaying item cards (name, price per kg, image)
- [ ] T050 [US1] Create frontend/src/app/page.tsx homepage importing BannerSlider, Gallery, MenuItems components
- [ ] T051 [US1] Test homepage: verify banners rotate, gallery displays, menu items show, responsive design works on mobile (320px width)

**Checkpoint**: At this point, User Story 1 should be fully functional - public website displays all content from Neon DB

---

## Phase 5: User Story 3 - Admin Manages Menu Items (Priority: P3)

**Goal**: Authenticated admins can add, edit, delete menu items with image uploads via admin panel

**Independent Test**: Login as admin, navigate to Menu Items page, add new item with image upload, verify it appears on public website, edit item price, delete item

### Implementation for User Story 3

- [ ] T052 [P] [US3] Create backend POST /items endpoint in backend/src/api/items.py accepting multipart form data (name, price_per_kg, image file)
- [ ] T053 [P] [US3] Implement image validation in POST /items: check file type (JPEG/PNG/GIF/WebP), size (<10MB) using Pillow, reject non-images
- [ ] T054 [US3] Implement image save logic: generate unique filename (timestamp + random string), save to backend/uploads/, store relative URL in items table
- [ ] T055 [P] [US3] Create backend PATCH /items/{id} endpoint accepting multipart form data (name, price_per_kg, optional image file)
- [ ] T056 [P] [US3] Create backend DELETE /items/{id} endpoint to delete item from items table
- [ ] T057 [US3] Apply verify_jwt middleware to POST /items, PATCH /items/{id}, DELETE /items/{id} endpoints (require authentication)
- [ ] T058 [US3] Configure FastAPI to serve backend/uploads/ as static files: app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
- [ ] T059 [US3] Test item CRUD endpoints with curl/Postman: create item with image, update item, delete item, verify JWT required
- [ ] T060 [P] [US3] Update frontend/src/services/itemsService.ts with createItem(), updateItem(), deleteItem() functions including JWT token
- [ ] T061 [US3] Create frontend/src/app/admin/layout.tsx with sidebar navigation (Dashboard, Menu Items, Gallery, Banners, Orders)
- [ ] T062 [US3] Create frontend/src/app/admin/page.tsx with protected route check (redirect to /login if no JWT token)
- [ ] T063 [P] [US3] Create frontend/src/app/admin/items/page.tsx listing items in table format (name, price, image thumbnail, Edit/Delete buttons)
- [ ] T064 [US3] Create "Add New Item" form modal/page in admin/items with inputs: name, price_per_kg (number with 2 decimals), image file upload with preview
- [ ] T065 [US3] Implement form submission: call itemsService.createItem() with multipart form data, refresh items list on success
- [ ] T066 [US3] Create "Edit Item" form pre-filled with existing data, submit PATCH request via itemsService.updateItem()
- [ ] T067 [US3] Implement delete confirmation dialog, call itemsService.deleteItem() on confirm
- [ ] T068 [US3] Test admin items page: add item with image, edit item, delete item, verify changes reflect on public homepage

**Checkpoint**: At this point, User Story 3 should be fully functional - admins can manage menu items with images

---

## Phase 6: User Story 4 - Admin Manages Gallery Images (Priority: P3)

**Goal**: Authenticated admins can upload gallery images and toggle active/inactive status

**Independent Test**: Login as admin, upload new gallery image, verify it appears on public gallery, toggle inactive, verify it disappears from public gallery

### Implementation for User Story 4

- [ ] T069 [P] [US4] Create backend POST /media/upload endpoint in backend/src/api/media.py accepting multipart form data (type: 'gallery', title, image file)
- [ ] T070 [US4] Implement image validation and save logic in POST /media/upload: validate file type, save to backend/uploads/, insert into media_assets table with is_active=true
- [ ] T071 [P] [US4] Create backend PATCH /media/{id}/toggle-active endpoint to flip is_active boolean in media_assets table
- [ ] T072 [P] [US4] Create backend DELETE /media/{id} endpoint to delete media asset (or mark is_active=false for soft delete)
- [ ] T073 [US4] Apply verify_jwt middleware to POST /media/upload, PATCH /media/{id}/toggle-active, DELETE /media/{id} endpoints
- [ ] T074 [US4] Test media endpoints with curl/Postman: upload gallery image, toggle active, delete, verify JWT required
- [ ] T075 [P] [US4] Update frontend/src/services/mediaService.ts with uploadMedia(), toggleActive(), deleteMedia() functions
- [ ] T076 [P] [US4] Create frontend/src/app/admin/gallery/page.tsx listing gallery images in grid with title, thumbnail, active/inactive toggle switch
- [ ] T077 [US4] Create "Upload Gallery Image" form with inputs: title, image file upload with preview
- [ ] T078 [US4] Implement upload form submission: call mediaService.uploadMedia() with type='gallery', refresh gallery list on success
- [ ] T079 [US4] Implement toggle active switch: call mediaService.toggleActive(), update UI immediately
- [ ] T080 [US4] Implement delete button with confirmation, call mediaService.deleteMedia()
- [ ] T081 [US4] Test admin gallery page: upload image, toggle active/inactive, verify public gallery reflects changes

**Checkpoint**: At this point, User Story 4 should be fully functional - admins can manage gallery images

---

## Phase 7: User Story 5 - Admin Changes Banners (Priority: P3)

**Goal**: Authenticated admins can upload banner images and activate/deactivate for homepage slider

**Independent Test**: Login as admin, upload new banner image, activate it, verify it appears in homepage slider auto-rotation

### Implementation for User Story 5

- [ ] T082 [P] [US5] Reuse backend POST /media/upload endpoint for type='banner' (already created in T069)
- [ ] T083 [P] [US5] Reuse backend PATCH /media/{id}/toggle-active and DELETE /media/{id} endpoints (already created in T071, T072)
- [ ] T084 [US5] Test banner upload via POST /media/upload with type='banner', verify stored in media_assets table
- [ ] T085 [P] [US5] Create frontend/src/app/admin/banners/page.tsx listing banner images with thumbnails, active/inactive toggle, delete button
- [ ] T086 [US5] Create "Upload Banner" form with inputs: title (optional), image file upload with preview
- [ ] T087 [US5] Implement upload form submission: call mediaService.uploadMedia() with type='banner', refresh banner list on success
- [ ] T088 [US5] Implement toggle active switch for banners: call mediaService.toggleActive(), update UI
- [ ] T089 [US5] Implement delete button for banners with confirmation
- [ ] T090 [US5] Test admin banners page: upload banner, toggle active/inactive, verify homepage slider reflects changes (active banners appear, inactive banners hidden)

**Checkpoint**: At this point, User Story 5 should be fully functional - admins can manage homepage banners

---

## Phase 8: User Story 6 - Admin Generates Order (Priority: P4)

**Goal**: Authenticated admins can create orders with customer details, selected items, quantities, advance payment, auto-calculated totals

**Independent Test**: Login as admin, create new order with customer name, select menu items with quantities, enter advance payment, verify total_amount and balance calculated correctly, verify order saved to Neon DB

### Implementation for User Story 6

- [ ] T091 [P] [US6] Create backend POST /orders endpoint in backend/src/api/orders.py accepting JSON body: customer_name, items: [{item_id, quantity}], advance_payment
- [ ] T092 [US6] Implement order creation logic: fetch item prices from items table, calculate total_amount = sum(price_per_kg * quantity), calculate balance = total_amount - advance_payment
- [ ] T093 [US6] Validate order data: items array not empty, quantities > 0, advance_payment <= total_amount, save Order to orders table with items as JSON
- [ ] T094 [P] [US6] Create backend GET /orders endpoint to fetch all orders with pagination (optional filter by date range)
- [ ] T095 [P] [US6] Create backend GET /orders/{id} endpoint to fetch single order by ID
- [ ] T096 [US6] Apply verify_jwt middleware to POST /orders, GET /orders, GET /orders/{id} endpoints
- [ ] T097 [US6] Test orders endpoints with curl/Postman: create order, fetch orders, fetch single order, verify calculations and JWT required
- [ ] T098 [P] [US6] Create frontend/src/services/ordersService.ts with createOrder(), fetchOrders(), fetchOrderById() functions
- [ ] T099 [US6] Create frontend/src/app/admin/orders/page.tsx with two sections: order creation form and orders list table
- [ ] T100 [US6] Implement order creation form: customer_name input, item selector (dropdown/search fetching from itemsService.fetchItems()), quantity input (number), add/remove item rows dynamically
- [ ] T101 [US6] Implement real-time total calculation in order form: calculate total_amount based on selected items and quantities (fetch prices from items list)
- [ ] T102 [US6] Add advance_payment input (number), display calculated balance = total_amount - advance_payment in real-time
- [ ] T103 [US6] Implement form submission: call ordersService.createOrder() with JSON payload, show success message, reset form
- [ ] T104 [US6] Implement orders list table: fetch orders via ordersService.fetchOrders(), display columns: order ID, customer name, total amount, balance, created date, "View Details" link
- [ ] T105 [US6] Create order details view (modal or separate page) fetching order by ID, displaying all order information including items breakdown
- [ ] T106 [US6] Test admin orders page: create order with multiple items, verify total/balance calculated correctly, verify order appears in list, view order details

**Checkpoint**: At this point, User Story 6 should be fully functional - admins can create and view orders with accurate calculations

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Testing, documentation, and deployment preparation (Phase 6 from implementation plan)

### Backend Testing

- [ ] T107 [P] Create backend/tests/test_auth.py with pytest tests: signup with valid/invalid email, login with correct/wrong password, JWT token expiration
- [ ] T108 [P] Create backend/tests/test_items.py with pytest tests: create item with image upload, fetch items, update item, delete item, validate file type rejection (10MB limit, non-images)
- [ ] T109 [P] Create backend/tests/test_media.py with pytest tests: upload banner/gallery, fetch active media, toggle is_active flag, delete media
- [ ] T110 [P] Create backend/tests/test_orders.py with pytest tests: create order with valid items, verify total_amount calculation, reject empty items array, validate advance_payment <= total_amount
- [ ] T111 Run pytest in backend/ directory, verify >80% coverage for business logic, fix any failing tests

### Frontend Testing

- [ ] T112 [P] Create frontend/tests/Navbar.test.tsx with Jest: render navbar, verify login/logout button visibility based on authentication state
- [ ] T113 [P] Create frontend/tests/BannerSlider.test.tsx with Jest: render slider with mocked API response, verify auto-rotation
- [ ] T114 [P] Create frontend/tests/AdminForm.test.tsx with Jest: submit item creation form, verify API call with correct multipart payload
- [ ] T115 Run npm test in frontend/ directory, verify tests pass

### Manual Testing Against Success Criteria

- [ ] T116 Measure homepage load time with browser DevTools Network tab, verify <3 seconds (SC-001)
- [ ] T117 Time admin login flow from click to dashboard, verify <30 seconds (SC-002)
- [ ] T118 Time adding new menu item with image upload, verify <2 minutes (SC-003)
- [ ] T119 Load test with 100 concurrent requests using wrk or ab tool, verify no degradation (SC-004)
- [ ] T120 Upload image via admin panel, refresh public page, verify appears within 5 seconds (SC-005)
- [ ] T121 Upload 20 images, track success rate, verify ≥95% success (SC-006)
- [ ] T122 Create order, inspect Neon DB directly, verify 100% data integrity - no partial saves (SC-007)
- [ ] T123 Test responsive design on Chrome DevTools device emulator at 320px width, verify all pages functional (SC-008)
- [ ] T124 Attempt accessing /admin routes without JWT token, verify redirect to /login page (SC-009)
- [ ] T125 Measure API response times with Postman: GET /items, POST /orders, verify <500ms (SC-010)

### Documentation & Deployment

- [ ] T126 [P] Create backend/.env from .env.example, fill DATABASE_URL (Neon connection string with SSL), BETTER_AUTH_SECRET (32+ chars), JWT_ALGORITHM=HS256, JWT_EXPIRE_DAYS=7
- [ ] T127 [P] Create frontend/.env.local from .env.local.example, fill NEXT_PUBLIC_API_URL=http://localhost:8000 (local) or production URL
- [ ] T128 Update specs/001-neon-fullstack/quickstart.md with production deployment section: backend to Render/Railway/Fly.io, frontend to Vercel
- [ ] T129 Configure CORS in backend/src/main.py to allow production frontend domain (add to allowed origins)
- [ ] T130 Verify HTTPS enforcement: test production backend requires SSL, Neon DB connection uses sslmode=require
- [ ] T131 Create production environment variable templates with placeholders (no secrets committed to Git)
- [ ] T132 Run final validation: all 10 success criteria passing, all user stories independently testable, constitution compliance verified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US2 (Phase 3): Authentication - should complete before other user stories (required for admin access)
  - US1 (Phase 4): Public website - can start after Foundational, does NOT require US2 (public endpoints)
  - US3 (Phase 5): Menu items - requires US2 (admin auth) for protected endpoints
  - US4 (Phase 6): Gallery - requires US2, can run parallel with US3, US5
  - US5 (Phase 7): Banners - requires US2, can run parallel with US3, US4
  - US6 (Phase 8): Orders - requires US2 and US3 (needs items for order creation)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 2 (P2) - Admin Auth**: Can start after Foundational (Phase 2) - No dependencies on other stories - BLOCKS US3, US4, US5, US6 (admin features require auth)
- **User Story 1 (P1) - Public Website**: Can start after Foundational (Phase 2) - No dependencies on other stories (public endpoints)
- **User Story 3 (P3) - Menu Items**: Depends on US2 (admin auth) - Can run parallel with US4, US5 after US2 completes
- **User Story 4 (P3) - Gallery**: Depends on US2 (admin auth) - Can run parallel with US3, US5 after US2 completes
- **User Story 5 (P3) - Banners**: Depends on US2 (admin auth) - Can run parallel with US3, US4 after US2 completes
- **User Story 6 (P4) - Orders**: Depends on US2 (admin auth) and US3 (items table) - Should complete after US3

### Within Each User Story

- Backend endpoints before frontend components that consume them
- Models before services (foundational phase)
- Services before API endpoints
- API endpoints before frontend service wrappers
- Frontend services before UI components
- Core implementation before integration

### Parallel Opportunities

- **Setup (Phase 1)**: T003-T007 can run in parallel (different files)
- **Foundational (Phase 2)**: T012-T014 (models), T020-T023 (TypeScript types) can run in parallel
- **US2 (Phase 3)**: T025-T026, T033-T034 can run in parallel (backend and frontend independent)
- **US1 (Phase 4)**: T038-T039, T041, T043, T045-T049 can run in parallel (different components)
- **US3 (Phase 5)**: T052-T056 (backend endpoints), T060, T063-T064 can run in parallel
- **US4 (Phase 6)**: T069-T072 (backend endpoints), T076-T077 can run in parallel
- **US5 (Phase 7)**: Reuses backend from US4, T085-T086 can run in parallel
- **US6 (Phase 8)**: T091-T095 (backend endpoints), T098-T100 can run in parallel
- **Testing (Phase 9)**: T107-T110 (backend tests), T112-T114 (frontend tests), T116-T125 (manual tests) can run in parallel
- **Once US2 completes, US3, US4, US5 can start in parallel** (different features, different files)

---

## Parallel Example: User Story 1 (Public Website)

```bash
# Launch all backend endpoints for User Story 1 together:
Task T041: "Create backend GET /media endpoint in backend/src/api/media.py"
Task T043: "Create backend GET /items endpoint in backend/src/api/items.py"

# Launch all frontend components for User Story 1 together:
Task T038: "Create frontend/src/components/Navbar.tsx"
Task T047: "Create frontend/src/components/BannerSlider.tsx"
Task T048: "Create frontend/src/components/Gallery.tsx"
Task T049: "Create frontend/src/components/MenuItems.tsx"

# Launch frontend service wrappers together:
Task T045: "Create frontend/src/services/mediaService.ts"
Task T046: "Create frontend/src/services/itemsService.ts"
```

---

## Parallel Example: User Story 3 (Menu Items Management)

```bash
# Launch all backend CRUD endpoints together:
Task T052: "Create backend POST /items endpoint"
Task T055: "Create backend PATCH /items/{id} endpoint"
Task T056: "Create backend DELETE /items/{id} endpoint"

# Launch frontend pages together (after backend complete):
Task T063: "Create frontend/src/app/admin/items/page.tsx"
Task T064: "Create Add New Item form modal/page"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup → Backend and frontend projects initialized
2. Complete Phase 2: Foundational → Database schema, models, migrations ready
3. Complete Phase 3: User Story 2 (Admin Auth) → Admins can login with JWT
4. Complete Phase 4: User Story 1 (Public Website) → Customers can view website
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready (public website + admin login functional)

**MVP Scope**: 51 tasks (T001-T051) deliver public website with admin authentication

### Incremental Delivery

1. Complete Setup (Phase 1) + Foundational (Phase 2) → T001-T024 → Foundation ready
2. Add User Story 2 (Admin Auth) → T025-T037 → Test independently → Admin login works
3. Add User Story 1 (Public Website) → T038-T051 → Test independently → Public website displays content
4. **Deploy/Demo MVP** ← Customers can browse, admins can login
5. Add User Story 3 (Menu Items) → T052-T068 → Test independently → Admins manage menu
6. Add User Story 4 (Gallery) → T069-T081 → Test independently → Admins manage gallery
7. Add User Story 5 (Banners) → T082-T090 → Test independently → Admins manage banners
8. Add User Story 6 (Orders) → T091-T106 → Test independently → Admins create orders
9. Complete Polish (Phase 9) → T107-T132 → Testing and deployment

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup (Phase 1) + Foundational (Phase 2) together → T001-T024
2. Developer A: User Story 2 (Admin Auth) → T025-T037 (BLOCKS US3-US6)
3. Developer B: User Story 1 (Public Website) → T038-T051 (INDEPENDENT, can start immediately)
4. Once US2 completes:
   - Developer A: User Story 3 (Menu Items) → T052-T068
   - Developer B: User Story 4 (Gallery) → T069-T081
   - Developer C: User Story 5 (Banners) → T082-T090
5. Developer D: User Story 6 (Orders) → T091-T106 (starts after US3 completes)
6. All developers: Polish & Testing → T107-T132 (parallel test execution)

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests written AFTER implementation (Phase 9) per spec - NOT TDD approach
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 (Admin Auth) blocks US3-US6 but NOT US1 (public endpoints don't require auth)
- US3 (Menu Items) blocks US6 (Orders) - orders need items table
- US3, US4, US5 can run in parallel after US2 completes
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Summary

**Total Tasks**: 132 tasks
- Phase 1 (Setup): 10 tasks (T001-T010)
- Phase 2 (Foundational): 14 tasks (T011-T024)
- Phase 3 (US2 - Admin Auth): 13 tasks (T025-T037)
- Phase 4 (US1 - Public Website): 14 tasks (T038-T051) 🎯 MVP with US2
- Phase 5 (US3 - Menu Items): 17 tasks (T052-T068)
- Phase 6 (US4 - Gallery): 13 tasks (T069-T081)
- Phase 7 (US5 - Banners): 9 tasks (T082-T090)
- Phase 8 (US6 - Orders): 16 tasks (T091-T106)
- Phase 9 (Polish & Testing): 26 tasks (T107-T132)

**Parallel Opportunities**: 62 tasks marked [P] can run in parallel within their phases

**Independent Tests**:
- US1: Navigate to homepage, verify banners/gallery/menu display
- US2: Signup → login → receive JWT → access admin panel
- US3: Login → add menu item → verify on public website
- US4: Login → upload gallery image → verify on public gallery
- US5: Login → upload banner → verify in homepage slider
- US6: Login → create order → verify calculations correct → verify saved to DB

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US2) + Phase 4 (US1) = 51 tasks
- Delivers: Public website with content display + admin login system
- Value: Customers can browse catering offerings, admins can authenticate
- Next increment: Add US3 (Menu Items management) for full content control
