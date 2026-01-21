---
id: 007
title: Create Better Auth Integration Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "authentication", "better-auth", "jwt", "security"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/better-auth.md
tests:
  - None
---

## Prompt

Create a skill named "Better Auth Integration".

Includes:
- Signup / Signin flows
- Session handling
- JWT issuing
- Secure frontend usage

Create at:
.claude/skills/better-auth.md

## Response snapshot

Created mandatory Better Auth Integration skill at `.claude/skills/better-auth.md`.

The skill defines authentication patterns for KN KITCHEN using Better Auth with JWT tokens:

**Core Principles:**
1. JWT + Session Hybrid - JWT tokens for stateless auth, database sessions for revocation
2. HTTP-Only Cookies - Store tokens in secure, HTTP-only cookies
3. Token Refresh - Automatic refresh before expiration
4. CSRF Protection - CSRF tokens for state-changing operations
5. Type Safety - Use generated types for auth state

**1. Backend Setup (FastAPI):**

**JWT Configuration:**
- Access token: 15 minutes expiration (short-lived)
- Refresh token: 7 days expiration (longer-lived)
- Algorithm: HS256
- JWT ID (jti) for token revocation via database sessions

**User Model:**
- Email, hashed_password, full_name, is_active, is_admin
- Password verification with bcrypt (12 rounds)
- Static hash_password method for secure storage

**Session Model:**
- Stores token_jti and refresh_token_jti for revocation
- Tracks expires_at, ip_address, user_agent
- Indexed on user_id, token_jti, refresh_token_jti

**Token Generation:**
- `create_access_token(user_id)` → (token, jti)
- `create_refresh_token(user_id)` → (token, jti)
- Includes sub (user_id), exp, iat, jti, type fields
- `verify_token(token, type)` validates signature and type

**Authentication Routes:**
- POST /auth/signup: Create account, issue tokens, set cookies
- POST /auth/signin: Verify credentials, issue tokens, set cookies
- POST /auth/signout: Revoke session, clear cookies
- POST /auth/refresh: Verify refresh token, issue new access token

**Cookie Configuration:**
- `cookie_name`: "kn_kitchen_token"
- `httponly=True`: Prevent JavaScript access (XSS protection)
- `secure=True`: HTTPS only in production
- `samesite="lax"`: CSRF protection
- Separate cookies for access and refresh tokens

**Authentication Dependency:**
- `get_current_user()`: Extract user from cookie or Authorization header
- Verify token signature and expiration
- Check session hasn't been revoked
- Return User object or raise 401

**2. Frontend Integration (Next.js):**

**Auth Context Provider:**
- `AuthProvider`: Manages user state, loading state
- `useAuth()` hook: signIn, signUp, signOut, refreshUser
- Fetch current user on mount
- Type-safe User interface

**Protected Routes:**
- `ProtectedRoute` component wraps pages
- Redirect to /login if not authenticated
- Show loading state during auth check

**Login Form:**
- Email/password inputs with validation
- Error handling and display
- Loading state during submission
- Redirect to dashboard on success

**Token Refresh Interceptor:**
- `apiRequest()` wrapper function
- Automatic token refresh on 401
- Retry original request after refresh
- Redirect to login if refresh fails
- Prevents multiple simultaneous refresh attempts

**3. Security Best Practices:**

**Password Requirements:**
- Minimum 8 characters
- Must contain uppercase, lowercase, number
- Pydantic validator enforces strength

**Rate Limiting:**
- 5 signin attempts per minute per IP
- 3 signups per hour per IP
- Using slowapi middleware

**CORS Configuration:**
- Allow specific origins only (localhost:3000, production domain)
- `allow_credentials=True` for cookie support
- Restrict methods and headers

**Cookie Security:**
- HTTP-only: Prevents XSS attacks
- Secure flag: HTTPS only in production
- SameSite=lax: CSRF protection
- Short expiration for access tokens

**Session Management:**
- Database-backed sessions for revocation
- Track IP address and user agent
- Expire sessions after 24 hours
- Delete on signout

**Best Practices Checklist:**
- [ ] HTTP-only cookies for token storage
- [ ] Secure cookies in production (HTTPS)
- [ ] SameSite protection (lax)
- [ ] Short access tokens (15 min)
- [ ] Long refresh tokens (7 days)
- [ ] Database session revocation
- [ ] Bcrypt password hashing (12 rounds)
- [ ] Password strength validation
- [ ] Rate limiting on auth endpoints
- [ ] Automatic token refresh
- [ ] CORS configured properly
- [ ] HTTPS only in production

The skill provides complete code examples for backend (FastAPI + JWT) and frontend (Next.js + React Context) integration.

## Outcome

- ✅ Impact: Established comprehensive authentication patterns ensuring secure user management, token-based auth, session revocation, and proper frontend/backend integration
- 🧪 Tests: None (authentication framework)
- 📁 Files: Created .claude/skills/better-auth.md (658 lines)
- 🔁 Next prompts: Reference during auth implementation, validate security practices in code reviews
- 🧠 Reflection: Skill covers both backend (JWT, sessions, cookies) and frontend (context, protected routes, refresh) with security best practices (HTTP-only cookies, rate limiting, password strength)

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during authentication implementation and security review
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test JWT token flow, session revocation, and automatic refresh during first auth implementation
