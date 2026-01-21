---
id: 004
title: Create FastAPI Backend Development Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "fastapi", "backend", "dependency-injection", "async"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/fastapi-backend.md
tests:
  - None
---

## Prompt

Create a skill named "FastAPI Backend Development".

Includes:
- Dependency injection
- JWT middleware
- Pydantic validation
- Clean route structure
- Async-safe patterns

Create at:
.claude/skills/fastapi-backend.md

## Response snapshot

Created mandatory FastAPI Backend Development skill at `.claude/skills/fastapi-backend.md`.

The skill defines best practices for building the KN KITCHEN backend API with FastAPI:

**Technology Stack:**
- Python 3.11+, FastAPI, SQLModel, Pydantic, Better Auth, Neon PostgreSQL

**Core Principles:**
1. Dependency Injection First - Use FastAPI's DI system for all dependencies
2. Validation at Boundaries - Pydantic models for all input/output
3. Async-Safe - Properly handle async/await to avoid blocking
4. Type Safety - Python type hints everywhere
5. Clean Separation - Routes handle HTTP, services handle business logic

**1. Dependency Injection:**
- Basic DI using `Depends()` for services, database sessions
- Nested dependencies (e.g., `require_admin` depends on `get_current_user`)
- Dependency scopes (request-scoped, application-scoped singletons)
- Background tasks for async work after response sent
- Database session management with auto-commit/rollback

**2. JWT Middleware and Authentication:**
- JWT configuration with secret key, algorithm, expiration
- Token generation (`create_access_token`) and verification (`verify_jwt_token`)
- Authentication dependency (`get_current_user`) for protected routes
- Protected routes require `Depends(get_current_user)`
- Login endpoint is public (no auth required)
- Alternative: Global middleware with public path exclusions

**3. Pydantic Validation:**
- Request DTOs with field validation, custom validators, root validators
- Response models with `orm_mode` for SQLModel conversion
- Automatic validation error handling with custom responses
- Business rule validation (min/max, date ranges, custom formats)
- Schema examples for API documentation

**4. Clean Route Structure:**
- Organized by domain/resource (orders, customers, invoices, reports)
- Thin controllers, fat services pattern
- Route handlers delegate to service layer (no business logic in routes)
- RESTful conventions (GET, POST, PUT, DELETE)
- Proper HTTP status codes (201 for create, 404 for not found)
- Main app assembly with router inclusion

**5. Async-Safe Patterns:**
- Use async for I/O-bound operations (database, external APIs, file I/O)
- Use sync for CPU-bound operations (calculations, PDF generation)
- Run sync code from async routes using `run_in_executor`
- Async database sessions (optional, only if needed for performance)
- Anti-patterns: blocking calls in async (time.sleep), not awaiting async calls

**Project Structure:**
```
backend/
├── src/
│   ├── api/routes/        # Domain-organized routes
│   ├── services/          # Business logic
│   ├── models/            # SQLModel database models
│   ├── schemas/           # Pydantic DTOs
│   ├── database.py        # DB connection
│   └── main.py            # FastAPI app
└── tests/
```

**Best Practices Checklist:**
- [ ] Dependencies injected (no direct instantiation)
- [ ] Authentication required (except login/health)
- [ ] Pydantic validation for all requests/responses
- [ ] Type hints on all functions
- [ ] Thin routes, business logic in services
- [ ] Async used correctly (I/O vs CPU)
- [ ] Proper error handling with HTTPException
- [ ] Correct HTTP status codes
- [ ] No secrets in code (environment variables)

The skill includes complete code examples showing correct patterns and anti-patterns to avoid.

## Outcome

- ✅ Impact: Established comprehensive FastAPI development patterns ensuring type safety, proper async usage, clean separation of concerns, and secure authentication
- 🧪 Tests: None (development guidelines)
- 📁 Files: Created .claude/skills/fastapi-backend.md (685 lines)
- 🔁 Next prompts: Reference during backend implementation, validate patterns in code reviews
- 🧠 Reflection: Skill provides detailed examples of dependency injection, authentication, validation, and async patterns - agents can reference these patterns when implementing backend features

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during first backend API implementation
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test DI patterns and async usage during first feature backend implementation
