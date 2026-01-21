# Implementation Plan: Neon PostgreSQL Full-Stack Application

**Branch**: `001-neon-fullstack` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-neon-fullstack/spec.md`

## Summary

Transform KN KITCHEN into a full-stack web application using Neon PostgreSQL as the only persistent data source, completely removing Sanity.io. Backend (FastAPI + SQLModel + Better Auth) provides JWT-secured REST APIs for content management, order creation, and media uploads. Frontend (Next.js 16+ App Router) offers responsive public website (homepage, gallery, menu) and admin panel for managing banners, menu items, gallery images, and orders. All data (users, orders, items, media_assets) resides in Neon DB; images stored in `/uploads` folder with URLs in database.

## Technical Context

**Language/Version**: Python 3.11+ (backend), TypeScript with Next.js 16+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Better Auth (backend); Next.js 16+, React 18+, TailwindCSS (frontend)
**Storage**: Neon PostgreSQL (serverless Postgres with SSL), local `/uploads` folder for images
**Testing**: pytest (backend), Jest/React Testing Library (frontend)
**Target Platform**: Linux server (backend), modern web browsers (frontend - responsive 320px+)
**Project Type**: Web application (separate backend and frontend)
**Performance Goals**: API response <500ms, homepage load <3 seconds, handle 100 concurrent users
**Constraints**: JWT expiration 7 days, image uploads max 10MB, only JPEG/PNG/GIF/WebP accepted
**Scale/Scope**: 4 database tables (users, orders, items, media_assets), 33 functional requirements, 6 user stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ⚠️ Violations Detected

| Principle | Current Spec | Constitution | Resolution |
|-----------|--------------|--------------|------------|
| **IV. Single Source of Truth** | Neon DB for menu items, pricing, content | Sanity.io CMS for content | **CONSTITUTIONAL AMENDMENT REQUIRED**: This feature spec explicitly removes Sanity.io and migrates all content to Neon DB. This is a MAJOR version change requiring user approval. Spec states "Sanity.io is removed completely" (line 6). |

### ✅ Compliant Principles

- **I. Data Integrity**: SQLModel constraints, no bypassing persistence layer
- **II. User Isolation**: JWT authentication required on all admin routes and API endpoints
- **III. Draft vs Confirmed Orders**: Spec assumes auto-save confirmed orders (no draft functionality in this phase per Assumption #5)
- **V. Billing Immutability**: Out of scope (no PDF invoice generation in this phase)
- **VI. Test Coverage**: Testing framework specified (pytest, Jest)
- **VII. Simplicity**: Standard patterns (Next.js App Router, FastAPI dependency injection, SQLModel ORM)

### Constitution Amendment Required

**Proposed Amendment**: Replace Principle IV with:

> **IV. Single Source of Truth for Content**
>
> Menu items, pricing, descriptions, media assets, and availability are managed exclusively in **Neon PostgreSQL database**. The application backend provides admin APIs for CRUD operations; the frontend admin panel allows staff to manage content without direct database access.
>
> **Rationale**: Consolidates data storage to single persistent layer (Neon DB), eliminates dependency on external CMS, allows admin staff to manage content via web UI without Sanity.io account costs.

**Migration Notes**:
- Any existing Sanity.io content must be manually migrated to Neon DB via admin panel
- Remove all Sanity client code from frontend and backend
- Re-upload images to `/uploads` folder

**User Approval Required**: YES - this is a breaking architectural change requiring constitutional amendment before implementation proceeds.

## Project Structure

### Documentation (this feature)

```text
specs/001-neon-fullstack/
├── plan.md              # This file (/sp.plan command output)
├── research.md          # Phase 0: Dependencies, Neon setup, Better Auth research
├── data-model.md        # Phase 1: SQLModel schemas, relationships, migrations
├── quickstart.md        # Phase 1: Local dev setup, env vars, run instructions
├── contracts/           # Phase 1: API contracts (OpenAPI/JSON)
│   ├── auth.json        # POST /auth/signup, POST /auth/login, POST /auth/logout
│   ├── items.json       # GET /items, POST /items, PATCH /items/{id}, DELETE /items/{id}
│   ├── media.json       # POST /media/upload, GET /media (banners/gallery), PATCH /media/{id}
│   └── orders.json      # GET /orders, POST /orders, GET /orders/{id}
└── tasks.md             # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/           # SQLModel classes (User, Order, Item, MediaAsset)
│   ├── services/         # Business logic (OrderService, MediaService, AuthService)
│   ├── api/              # FastAPI routers (auth, items, orders, media)
│   ├── middleware/       # JWT verification middleware
│   ├── config.py         # Environment variable loading, DB connection
│   ├── main.py           # FastAPI app entry point, CORS config
│   └── database.py       # SQLModel engine, session dependency
├── uploads/              # Local image storage (create on first run)
├── alembic/              # Database migrations
│   ├── versions/         # Migration scripts
│   └── env.py            # Alembic config
├── tests/
│   ├── test_auth.py      # Authentication endpoint tests
│   ├── test_items.py     # Items CRUD tests
│   ├── test_orders.py    # Orders creation tests
│   └── test_media.py     # Media upload/fetch tests
├── requirements.txt      # Python dependencies
├── .env.example          # Template for environment variables
└── pytest.ini            # Pytest configuration

frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Homepage (banners, gallery, menu)
│   │   ├── admin/        # Admin panel pages
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── items/page.tsx     # Manage menu items
│   │   │   ├── gallery/page.tsx   # Manage gallery images
│   │   │   ├── banners/page.tsx   # Manage banners
│   │   │   └── orders/page.tsx    # Create/view orders
│   │   ├── login/page.tsx         # Login page
│   │   └── layout.tsx    # Root layout (navbar)
│   ├── components/       # Reusable UI components
│   │   ├── Navbar.tsx    # Logo, nav links, login/logout button
│   │   ├── BannerSlider.tsx  # Auto-rotating banner carousel
│   │   ├── Gallery.tsx   # Image grid
│   │   ├── MenuItems.tsx # Menu item list
│   │   └── AdminForm.tsx # Forms for items/orders/media
│   ├── services/         # API client wrappers
│   │   ├── authService.ts    # login, logout, signup
│   │   ├── itemsService.ts   # CRUD items
│   │   ├── mediaService.ts   # Upload/fetch media
│   │   └── ordersService.ts  # Create/fetch orders
│   ├── lib/              # Utilities
│   │   └── axios.ts      # Axios instance with JWT interceptor
│   └── types/            # TypeScript interfaces
│       ├── User.ts
│       ├── Order.ts
│       ├── Item.ts
│       └── MediaAsset.ts
├── public/               # Static assets
├── tests/
│   ├── Navbar.test.tsx
│   ├── BannerSlider.test.tsx
│   └── AdminForm.test.tsx
├── package.json          # Node dependencies
├── tailwind.config.ts    # TailwindCSS config
├── next.config.js        # Next.js config
├── .env.local.example    # Template for env vars
└── tsconfig.json         # TypeScript config
```

**Structure Decision**: Web application with separate `backend/` (FastAPI) and `frontend/` (Next.js) directories. Backend serves REST APIs; frontend consumes APIs via Axios client. Images stored in `backend/uploads/` and served as static files. Database schema managed via Alembic migrations in `backend/alembic/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle IV (Sanity.io CMS) | Consolidate all data to single persistent layer (Neon DB), eliminate external dependency, reduce operational costs | Keeping Sanity.io would require maintaining two data sources, syncing issues, additional API keys, and ongoing CMS subscription costs. User explicitly requested removal. |

---

## Phase-Wise Implementation Roadmap

### Phase 0: Setup & Research

**Objective**: Establish project foundation, resolve dependencies, verify Neon DB connectivity, and research Better Auth integration patterns.

**Tasks**:

1. **Initialize Backend Project Structure**
   - Create `backend/` directory with FastAPI boilerplate
   - Set up virtual environment and install dependencies: `fastapi`, `sqlmodel`, `uvicorn`, `python-multipart`, `pillow`, `alembic`, `python-jose[cryptography]`, `passlib[bcrypt]`, `better-auth` (or equivalent JWT library)
   - Create `.env.example` with placeholders: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_DAYS`
   - Create `backend/src/config.py` to load environment variables using `pydantic.BaseSettings`

2. **Initialize Frontend Project Structure**
   - Create `frontend/` directory with Next.js 16+ App Router: `npx create-next-app@latest frontend --typescript --tailwind --app`
   - Install dependencies: `axios`, `react-hook-form`, `zod`, `@heroicons/react`, `swiper` (for banner slider)
   - Create `.env.local.example` with placeholder: `NEXT_PUBLIC_API_URL`

3. **Verify Neon PostgreSQL Connectivity**
   - Create `backend/src/database.py` with SQLModel engine and session factory
   - Test connection using provided connection string with SSL mode required: `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`
   - Create basic health check endpoint `GET /health` returning database connection status

4. **Research Better Auth Integration**
   - Investigate Better Auth library for JWT token generation and verification with FastAPI
   - Document authentication flow: signup (hash password) → login (verify password, issue JWT) → middleware (verify JWT on protected routes)
   - Create `specs/001-neon-fullstack/research.md` documenting: Better Auth setup, JWT payload structure, token expiration handling, middleware implementation pattern

**Dependencies**: None (first phase)

**Deliverables**:
- `backend/` and `frontend/` directories with boilerplate code
- Environment variable templates (`.env.example`, `.env.local.example`)
- Database connectivity verification script
- `research.md` with Better Auth integration findings

---

### Phase 1: Design & Contracts

**Objective**: Define database schema, API contracts, and domain models without implementing business logic.

**Tasks**:

1. **Design SQLModel Database Schema**
   - Create `specs/001-neon-fullstack/data-model.md` documenting all tables, columns, types, constraints, and relationships
   - Define SQLModel classes in `backend/src/models/`:
     - `User(id, name, email UNIQUE, password_hash, created_at)`
     - `Order(id, user_id FK, items JSON, total_amount Decimal, advance_payment Decimal, balance Decimal, created_at)`
     - `Item(id, name, price_per_kg Decimal, image_url, created_at)`
     - `MediaAsset(id, type Enum['banner'/'gallery'/'item'], title, image_url, is_active Boolean, created_at)`
   - Initialize Alembic: `alembic init alembic` and create initial migration script

2. **Define API Contracts (OpenAPI/JSON Schema)**
   - Create JSON contract files in `specs/001-neon-fullstack/contracts/`:
     - `auth.json`: POST /auth/signup (body: {name, email, password}), POST /auth/login (body: {email, password}, response: {token}), POST /auth/logout
     - `items.json`: GET /items, POST /items (body: {name, price_per_kg, image FormData}), PATCH /items/{id}, DELETE /items/{id}
     - `media.json`: POST /media/upload (body: {type, title, image FormData}), GET /media?type=banner|gallery, PATCH /media/{id}/toggle-active
     - `orders.json`: POST /orders (body: {customer_name, items: [{item_id, quantity}], advance_payment}), GET /orders, GET /orders/{id}
   - Specify request/response schemas, status codes (200, 201, 400, 401, 403, 404, 500), and error formats

3. **Create TypeScript Types for Frontend**
   - Create `frontend/src/types/` with interfaces matching API contracts:
     - `User.ts`, `Order.ts`, `Item.ts`, `MediaAsset.ts`
   - Define request/response DTOs (e.g., `CreateOrderRequest`, `LoginResponse`)

4. **Write Quickstart Documentation**
   - Create `specs/001-neon-fullstack/quickstart.md` with:
     - Prerequisites (Python 3.11+, Node 18+, Neon DB account)
     - Backend setup: clone repo, create virtual env, copy `.env.example` to `.env`, fill `DATABASE_URL` and `BETTER_AUTH_SECRET`, run migrations `alembic upgrade head`, start server `uvicorn src.main:app --reload`
     - Frontend setup: install deps `npm install`, copy `.env.local.example` to `.env.local`, set `NEXT_PUBLIC_API_URL=http://localhost:8000`, start dev server `npm run dev`
     - Create admin user via `POST /auth/signup` curl example

**Dependencies**: Phase 0 (project structure exists)

**Deliverables**:
- `data-model.md` with complete database schema
- `contracts/` directory with JSON API contracts
- SQLModel models in `backend/src/models/`
- TypeScript types in `frontend/src/types/`
- `quickstart.md` for local development

---

### Phase 2: Backend Core (Authentication & Database)

**Objective**: Implement authentication system (Better Auth with JWT) and database connection layer. Admin panel routes protected.

**Tasks**:

1. **Implement User Signup and Login**
   - Create `backend/src/api/auth.py` router with endpoints: POST /auth/signup, POST /auth/login
   - In signup: validate email format, hash password with `passlib[bcrypt]`, save to `users` table in Neon DB
   - In login: verify email/password, generate JWT token (payload: {user_id, email, exp}), return token with 7-day expiration

2. **Implement JWT Verification Middleware**
   - Create `backend/src/middleware/auth.py` with `verify_jwt` dependency
   - Decode JWT token from `Authorization: Bearer <token>` header, verify signature using `BETTER_AUTH_SECRET`
   - Return authenticated user object or raise 401 Unauthorized error

3. **Apply Middleware to Admin Routes**
   - Protect all admin API endpoints (items, orders, media) by adding `current_user: User = Depends(verify_jwt)` dependency
   - Public endpoints (GET /items, GET /media?type=banner|gallery) remain unprotected

4. **Run Database Migrations**
   - Execute Alembic migration to create `users`, `orders`, `items`, `media_assets` tables in Neon DB: `alembic upgrade head`
   - Verify tables exist using Neon SQL editor or psql client

**Dependencies**: Phase 1 (database schema and API contracts defined)

**Deliverables**:
- Authentication endpoints (`/auth/signup`, `/auth/login`) returning JWT tokens
- JWT verification middleware protecting admin routes
- Database tables created in Neon DB via Alembic migration
- Manual test: signup → login → access protected endpoint with token

---

### Phase 3: Backend API (Items, Media, Orders)

**Objective**: Implement CRUD operations for menu items, media assets (banners/gallery), and order creation. File uploads working.

**Tasks**:

1. **Implement Items CRUD API**
   - Create `backend/src/api/items.py` router:
     - GET /items: fetch all items from `items` table
     - POST /items: accept multipart form data (name, price_per_kg, image file), save image to `/uploads`, store URL in `items` table
     - PATCH /items/{id}: update name/price/image
     - DELETE /items/{id}: soft delete or hard delete (based on spec assumption)
   - Validate image file type (JPEG/PNG/GIF/WebP) and size (<10MB) using Pillow
   - Generate unique filenames: `{timestamp}_{random_string}.{ext}`

2. **Implement Media Upload and Fetch API**
   - Create `backend/src/api/media.py` router:
     - POST /media/upload: accept multipart form data (type: 'banner'/'gallery', title, image file), save to `/uploads`, insert into `media_assets` table with `is_active=true`
     - GET /media?type=banner|gallery: fetch active media assets filtered by type
     - PATCH /media/{id}/toggle-active: flip `is_active` boolean for admin control
   - Reuse image validation logic from items API

3. **Implement Orders API**
   - Create `backend/src/api/orders.py` router:
     - POST /orders: accept order payload (customer_name, items: [{item_id, quantity}], advance_payment), fetch prices from `items` table, calculate `total_amount = sum(item.price_per_kg * quantity)`, calculate `balance = total_amount - advance_payment`, save to `orders` table with `items` as JSON
     - GET /orders: fetch all orders with pagination (optional: filter by date range)
     - GET /orders/{id}: fetch single order by ID
   - Validate: items array not empty, quantities > 0, advance_payment <= total_amount

4. **Serve Uploaded Images as Static Files**
   - Configure FastAPI to serve `/uploads` directory as static files: `app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")`
   - Test image access via browser: `http://localhost:8000/uploads/1234567890_abc.jpg`

**Dependencies**: Phase 2 (authentication and database operational)

**Deliverables**:
- Items CRUD endpoints with image uploads
- Media upload/fetch endpoints with banner/gallery filtering
- Orders creation endpoint with price calculation
- Static file serving for uploaded images
- Manual tests: upload item image, upload banner, create order, fetch via GET endpoints

---

### Phase 4: Frontend Public Pages (Homepage, Gallery, Menu)

**Objective**: Build responsive public-facing website with navbar, banner slider, gallery section, and menu items list. All data fetched from backend API.

**Tasks**:

1. **Build Navbar Component**
   - Create `frontend/src/components/Navbar.tsx` with TailwindCSS:
     - Left: KN KITCHEN logo/text
     - Center: Navigation links (HOME, ABOUT, GALLERY, CONTACT, FEEDBACK) - anchor links or Next.js `<Link>`
     - Right: Login button (if not authenticated) or user name + Logout button (if authenticated)
   - Store JWT token in localStorage on login, remove on logout
   - Show/hide Login/Logout button based on token presence

2. **Build Homepage with Banner Slider**
   - Create `frontend/src/app/page.tsx`:
     - Fetch active banners from `GET /media?type=banner` on page load (Server Component or `useEffect` in Client Component)
     - Display auto-rotating banner slider using Swiper library or CSS animations (5-second rotation per spec assumption)
     - Responsive layout: full-width on desktop, stacked on mobile

3. **Build Gallery Section**
   - Create `frontend/src/components/Gallery.tsx`:
     - Fetch active gallery images from `GET /media?type=gallery`
     - Display in responsive grid (3-4 columns desktop, 1-2 columns mobile) using TailwindCSS grid
     - Add to homepage or create separate `/gallery` route

4. **Build Menu Items Section**
   - Create `frontend/src/components/MenuItems.tsx`:
     - Fetch items from `GET /items`
     - Display item cards with: name, price per kg, image thumbnail
     - Responsive grid layout

**Dependencies**: Phase 3 (backend APIs operational)

**Deliverables**:
- Responsive navbar with login/logout functionality
- Homepage with auto-rotating banner slider fetching from backend
- Gallery section with images fetched from backend
- Menu items section with items fetched from backend
- Responsive design testing on 320px+ screen widths

---

### Phase 5: Frontend Admin Panel (Content & Order Management)

**Objective**: Build admin panel for authenticated users to manage menu items, gallery images, banners, and create orders. All operations via backend API with JWT authentication.

**Tasks**:

1. **Build Admin Dashboard Layout**
   - Create `frontend/src/app/admin/page.tsx` with protected route (redirect to `/login` if no JWT token)
   - Sidebar or tab navigation: Dashboard, Menu Items, Gallery, Banners, Orders
   - Verify JWT token validity on page load (if expired, redirect to login)

2. **Build Menu Items Management Page**
   - Create `frontend/src/app/admin/items/page.tsx`:
     - List all items in table format (name, price, image thumbnail, actions)
     - "Add New Item" button opens form modal/page
     - Form: name input, price_per_kg input (number with 2 decimals), image file upload (with preview)
     - Submit: POST /items with multipart form data, include JWT token in `Authorization` header
     - Edit button: pre-fill form with existing data, submit PATCH /items/{id}
     - Delete button: confirm dialog, submit DELETE /items/{id}

3. **Build Gallery & Banners Management Pages**
   - Create `frontend/src/app/admin/gallery/page.tsx`:
     - List gallery images in grid with title and active/inactive toggle
     - "Upload New Image" button opens form (title input, image file upload)
     - Submit: POST /media/upload with type='gallery'
     - Toggle active: PATCH /media/{id}/toggle-active
   - Create `frontend/src/app/admin/banners/page.tsx` with identical structure (type='banner')

4. **Build Order Creation Page**
   - Create `frontend/src/app/admin/orders/page.tsx`:
     - Form: customer_name input, item selector (dropdown/search fetching from GET /items), quantity input (number), add/remove item rows dynamically
     - Calculate total_amount in real-time based on selected items and quantities
     - Advance payment input (number), display calculated balance (total - advance)
     - Submit: POST /orders with JWT token
     - Success: show order confirmation and redirect to orders list
     - Orders list view: table with order ID, customer name, total amount, balance, created date, "View Details" link

**Dependencies**: Phase 4 (public frontend complete), Phase 3 (backend APIs operational)

**Deliverables**:
- Admin dashboard with protected routes (JWT verification)
- Menu items management page (add, edit, delete with image uploads)
- Gallery and banners management pages (upload, toggle active)
- Order creation page with item selection, price calculation, and submission
- Manual testing: login as admin → add item → upload gallery image → create order

---

### Phase 6: Testing & Launch Preparation

**Objective**: Ensure all functional requirements are met, write automated tests, verify success criteria, and prepare for deployment.

**Tasks**:

1. **Write Backend API Tests**
   - Create pytest tests in `backend/tests/`:
     - `test_auth.py`: signup with valid/invalid email, login with correct/wrong password, JWT token expiration
     - `test_items.py`: create item with image upload, fetch items, update item, delete item, validate file type rejection
     - `test_media.py`: upload banner/gallery, fetch active media, toggle is_active flag
     - `test_orders.py`: create order with valid items, verify total_amount calculation, reject empty items array
   - Run tests: `pytest` (target: >80% coverage for business logic)

2. **Write Frontend Component Tests**
   - Create Jest/React Testing Library tests in `frontend/tests/`:
     - `Navbar.test.tsx`: render navbar, verify login/logout button visibility
     - `BannerSlider.test.tsx`: render slider with mocked API response, verify rotation
     - `AdminForm.test.tsx`: submit item creation form, verify API call with correct payload
   - Run tests: `npm test`

3. **Manual Testing Against Success Criteria**
   - **SC-001**: Measure homepage load time (<3s) with browser DevTools Network tab
   - **SC-002**: Time admin login flow (<30s)
   - **SC-003**: Time adding new menu item (<2min)
   - **SC-004**: Load test with 100 concurrent requests using `wrk` or `ab` tool
   - **SC-005**: Upload image, verify appears on public website within 5s (with refresh)
   - **SC-006**: Upload 20 images, verify 95% success rate
   - **SC-007**: Create order, verify data integrity in database (no partial saves)
   - **SC-008**: Test responsive design on Chrome DevTools device emulator (320px width)
   - **SC-009**: Attempt accessing `/admin` without JWT, verify redirect to `/login`
   - **SC-010**: Measure API response times with Postman or curl (`GET /items`, `POST /orders`)

4. **Deployment Preparation**
   - Create production environment variable templates with placeholders
   - Document deployment steps in `specs/001-neon-fullstack/quickstart.md` (production section):
     - Backend: deploy to Render/Railway/Fly.io with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `JWT_ALGORITHM=HS256`, `JWT_EXPIRE_DAYS=7`
     - Frontend: deploy to Vercel with `NEXT_PUBLIC_API_URL=<production-backend-url>`
   - Verify CORS configuration in FastAPI allows production frontend domain
   - Test HTTPS enforcement (SSL mode required for Neon DB)

**Dependencies**: Phase 5 (all features implemented)

**Deliverables**:
- Automated tests for backend API (pytest suite) with >80% coverage
- Automated tests for frontend components (Jest suite)
- Manual test results documented for all 10 success criteria
- Deployment documentation and environment variable templates
- Production-ready application passing all acceptance scenarios

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Better Auth library incompatibility with FastAPI** | Medium | High | Phase 0 research confirms integration pattern; fallback to manual JWT implementation using `python-jose` |
| **Neon DB connection issues (SSL mode)** | Low | High | Phase 0 verifies connectivity early; document SSL troubleshooting steps |
| **Image upload file size limits** | Medium | Medium | Implement backend validation (10MB limit) with clear error messages; document in admin UI |
| **JWT token expiration during admin work** | Medium | Medium | Implement token refresh mechanism or show session timeout warning 5 minutes before expiry |
| **Concurrent admin actions (banner updates)** | Low | Low | Last write wins (spec assumption); document in edge cases |
| **Constitutional amendment rejection** | High | Critical | User must approve Principle IV amendment before implementation proceeds; if rejected, entire spec is blocked |

---

## Next Steps

1. **User Approval Required**: Review and approve constitutional amendment (Principle IV: Sanity.io → Neon DB migration)
2. **Execute Phase 0**: Run `/sp.tasks` to generate actionable tasks for Phase 0 (Setup & Research)
3. **Generate Research Document**: Create `specs/001-neon-fullstack/research.md` during Phase 0 execution
4. **Iterative Execution**: Complete phases sequentially (0 → 1 → 2 → 3 → 4 → 5 → 6), generating tasks per phase with `/sp.tasks`

---

**Plan Status**: ✅ Complete - Awaiting user approval for constitutional amendment before proceeding to task generation
