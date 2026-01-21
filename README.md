# KN KITCHEN - Neon PostgreSQL Full-Stack Application

Professional catering management system built with FastAPI (backend) and Next.js 16+ (frontend), using Neon PostgreSQL as the single source of truth.

## Project Status: MVP Development in Progress

**Current Phase**: Phase 1 Complete ✅ - Setup & Infrastructure
**Next Phase**: Phase 2 - Foundational (Database Schema & Models)

## Architecture

- **Backend**: FastAPI + SQLModel + Better Auth (JWT) + Neon PostgreSQL
- **Frontend**: Next.js 16+ (App Router) + React 19 + TailwindCSS + TypeScript
- **Database**: Neon PostgreSQL (serverless, SSL required)
- **Authentication**: JWT tokens (7-day expiration)
- **Media Storage**: Local `/uploads` folder (URLs stored in database)

## Project Structure

```
KN-KITCHEN/
├── backend/               # FastAPI backend
│   ├── src/
│   │   ├── api/          # API routes (will be added in phases)
│   │   ├── models/       # SQLModel database models
│   │   ├── middleware/   # JWT authentication middleware
│   │   ├── config.py     # Environment configuration
│   │   ├── database.py   # Database connection & session
│   │   └── main.py       # FastAPI app entry point
│   ├── uploads/          # Uploaded images storage
│   ├── tests/            # Pytest test suite
│   ├── requirements.txt  # Python dependencies
│   ├── .env.example      # Environment template
│   └── .env              # ⚠️ NEEDS CONFIGURATION
│
├── frontend/             # Next.js frontend
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── services/         # API client wrappers
│   ├── types/            # TypeScript interfaces
│   ├── lib/              # Utilities (Axios client)
│   ├── package.json      # Node dependencies
│   ├── .env.local.example # Environment template
│   └── .env.local        # Frontend environment (configured ✅)
│
└── specs/                # Feature specifications & documentation
    └── 001-neon-fullstack/
        ├── spec.md       # Feature requirements (33 functional requirements)
        ├── plan.md       # Implementation plan (7 phases)
        └── tasks.md      # Task breakdown (132 tasks total, 51 for MVP)
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- **Neon PostgreSQL account** with database created

### Step 1: Configure Backend Environment

**CRITICAL**: You must configure your Neon PostgreSQL credentials before the backend will work.

1. Navigate to `backend/.env` file
2. Replace the placeholder `DATABASE_URL` with your actual Neon connection string:
   ```
   DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST.neon.tech/YOUR_DB?sslmode=require
   ```
3. Generate a secure JWT secret (32+ characters):
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
4. Replace `BETTER_AUTH_SECRET` in `backend/.env` with the generated secret

### Step 2: Run Backend

```bash
cd backend

# Activate virtual environment (Windows)
venv\Scripts\activate

# Or on macOS/Linux
source venv/bin/activate

# Start FastAPI server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Visit http://localhost:8000/docs for API documentation.
Health check: http://localhost:8000/health

### Step 3: Run Frontend

```bash
cd frontend

# Start Next.js development server
npm run dev
```

Visit http://localhost:3000

## Current Capabilities (Phase 1 Complete)

✅ Backend project structure initialized
✅ FastAPI application with CORS configured
✅ Health check endpoint (`GET /health`)
✅ Environment configuration with Pydantic Settings
✅ Database connection module (SQLModel + Neon)
✅ Frontend Next.js 16+ with App Router
✅ TailwindCSS configured
✅ TypeScript configured

## What's Next (Phase 2 - In Development)

The next phase will create:

- 📊 **Database Models**: User, Order, Item, MediaAsset (SQLModel)
- 🔄 **Alembic Migrations**: Database schema creation
- 📁 **TypeScript Types**: Frontend interfaces matching backend models
- 🔌 **Axios Client**: HTTP client with JWT interceptor

**Tasks**: T011-T024 (14 tasks) - Foundational infrastructure

## MVP Roadmap (51 Tasks Total)

- **Phase 1: Setup** (T001-T010) ✅ COMPLETE
- **Phase 2: Foundational** (T011-T024) 🔄 NEXT
- **Phase 3: Admin Authentication** (T025-T037) - JWT login system
- **Phase 4: Public Website** (T038-T051) - Homepage with content

**MVP Delivers**: Public website displaying banners/gallery/menu + admin login system

## User Stories (6 Total)

1. **US1 (P1)** 🎯 MVP: Customer Views Public Website
2. **US2 (P2)** 🎯 MVP: Admin Authentication and Access
3. **US3 (P3)**: Admin Manages Menu Items
4. **US4 (P3)**: Admin Manages Gallery Images
5. **US5 (P3)**: Admin Changes Banners
6. **US6 (P4)**: Admin Generates Orders

## Technology Stack

### Backend
- FastAPI 0.109.0
- SQLModel 0.0.14 (ORM)
- Alembic 1.13.1 (migrations)
- Python-JOSE 3.3.0 (JWT)
- Passlib 1.7.4 (password hashing)
- Pillow 10.2.0 (image validation)
- Uvicorn 0.27.0 (ASGI server)

### Frontend
- Next.js 16.1.3 (App Router)
- React 19.0.0
- TypeScript 5
- TailwindCSS 3.4.1
- Axios 1.6.5 (HTTP client)
- React Hook Form 7.49.3 (forms)
- Zod 3.22.4 (validation)
- Swiper 11.0.5 (banner slider)

### Database
- Neon PostgreSQL (serverless)
- SSL mode required
- 4 tables: users, orders, items, media_assets

## Constitutional Amendment (Approved)

**Version**: 2.0.0 (MAJOR change)

**Amendment**: Principle IV replaced - removed Sanity.io CMS dependency. Content now managed exclusively in Neon PostgreSQL database via admin panel (web UI) instead of external CMS.

**Rationale**: Consolidates data storage, eliminates external dependency, reduces operational costs.

## Development Commands

### Backend

```bash
# Start development server with auto-reload
uvicorn src.main:app --reload

# Run tests (when implemented)
pytest

# Create database migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Frontend

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint

# Run tests (when implemented)
npm test
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=require
BETTER_AUTH_SECRET=your-32-char-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints (Planned)

### Authentication
- `POST /auth/signup` - Create admin account
- `POST /auth/login` - Login and receive JWT token
- `POST /auth/logout` - Logout (client-side token removal)

### Items (Menu)
- `GET /items` - Fetch all menu items
- `POST /items` - Create item with image (admin only)
- `PATCH /items/{id}` - Update item (admin only)
- `DELETE /items/{id}` - Delete item (admin only)

### Media (Banners & Gallery)
- `POST /media/upload` - Upload banner/gallery image (admin only)
- `GET /media?type=banner|gallery` - Fetch active media by type
- `PATCH /media/{id}/toggle-active` - Toggle active status (admin only)
- `DELETE /media/{id}` - Delete media (admin only)

### Orders
- `POST /orders` - Create order with price calculation (admin only)
- `GET /orders` - Fetch all orders (admin only)
- `GET /orders/{id}` - Fetch single order (admin only)

### Static Files
- `GET /uploads/{filename}` - Serve uploaded images

## Success Criteria

1. Homepage loads in <3 seconds (SC-001)
2. Admin login <30 seconds (SC-002)
3. Add menu item <2 minutes (SC-003)
4. Handle 100 concurrent users (SC-004)
5. Images appear <5 seconds after upload (SC-005)
6. 95% upload success rate (SC-006)
7. 100% order data integrity (SC-007)
8. Responsive on 320px+ screens (SC-008)
9. Admin panel protected (redirect to login) (SC-009)
10. API response <500ms (SC-010)

## Security Notes

🔒 **JWT Secret**: MUST be 32+ characters random string
🔒 **Database URL**: Never commit to Git (in .gitignore)
🔒 **SSL Required**: Neon PostgreSQL connections require sslmode=require
🔒 **CORS**: Configured to allow frontend domain only
🔒 **Passwords**: Hashed with bcrypt before storage
🔒 **File Uploads**: Validated (JPEG/PNG/GIF/WebP only, <10MB)

## Testing

### Backend Tests (pytest)
- Authentication: signup, login, JWT validation
- Items: CRUD with image upload
- Media: upload, fetch, toggle active
- Orders: creation, validation, price calculation

### Frontend Tests (Jest)
- Component rendering
- Form submissions
- API integration

### Manual Testing
- All 10 success criteria
- Cross-browser compatibility
- Responsive design (320px+)
- End-to-end user flows

## Troubleshooting

### Backend won't start
- ✅ Check `DATABASE_URL` is configured with real Neon credentials
- ✅ Verify `BETTER_AUTH_SECRET` is set (32+ chars)
- ✅ Ensure virtual environment is activated
- ✅ Run `pip install -r requirements.txt`

### Frontend won't start
- ✅ Run `npm install` in frontend/ directory
- ✅ Check Node.js version (18+ required)
- ✅ Verify `.env.local` exists with `NEXT_PUBLIC_API_URL`

### Database connection fails
- ✅ Verify Neon PostgreSQL database is running
- ✅ Check connection string includes `?sslmode=require`
- ✅ Test connection from Neon dashboard SQL editor

## Documentation

- **Feature Spec**: `specs/001-neon-fullstack/spec.md` - Complete requirements
- **Implementation Plan**: `specs/001-neon-fullstack/plan.md` - 7-phase roadmap
- **Task Breakdown**: `specs/001-neon-fullstack/tasks.md` - 132 detailed tasks
- **Constitution**: `.specify/memory/constitution.md` - Project principles

## License

Proprietary - KN KITCHEN Catering Management System

---

**Status**: Phase 1 Complete ✅ | **Next**: Phase 2 (Database Models) | **Target**: MVP (51 tasks)

For implementation details, see `specs/001-neon-fullstack/tasks.md`
