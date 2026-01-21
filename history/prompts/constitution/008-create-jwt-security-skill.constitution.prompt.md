---
id: 008
title: Create JWT Security Skill
stage: constitution
date: 2026-01-16
surface: agent
model: claude-sonnet-4-5
feature: none
branch: master
user: system
command: manual
labels: ["skill", "jwt", "security", "authentication", "authorization"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .claude/skills/jwt-security.md
tests:
  - None
---

## Prompt

Create a skill named "JWT Security".

Includes:
- Token verification
- Expiry handling
- User isolation enforcement
- Authorization headers

Create at:
.claude/skills/jwt-security.md

## Response snapshot

Created mandatory JWT Security skill at `.claude/skills/jwt-security.md`.

The skill defines comprehensive JWT security patterns for KN KITCHEN:

**Core Principles:**
1. Always Verify - Never trust token claims without signature verification
2. Check Expiration - Expired tokens MUST be rejected
3. Validate Claims - Verify all required claims are present and valid
4. Secure Storage - Never log or expose tokens
5. User Isolation - User ID from token determines data access

**1. Token Verification:**

**Signature Verification:**
- Use `jwt.decode(token, secret, algorithms=["HS256"])` with explicit algorithm
- Verify all required claims: sub, exp, iat, jti, type
- Validate user ID format (must be positive integer)
- Check token type matches expected (access vs refresh)
- Raise HTTPException with 401 status on failures

**Algorithm Confusion Prevention:**
- Explicitly specify allowed algorithms: `algorithms=["HS256"]`
- Never allow algorithm inference from token header
- Prevent "none" algorithm attacks

**Claim Validation:**
- `sub` (subject/user_id): Present, valid integer, positive
- `exp` (expiration): In the future
- `iat` (issued at): Not in the future (prevent future-dated tokens)
- `jti` (JWT ID): Present for revocation tracking
- `type`: Matches expected type (access/refresh)

**2. Expiry Handling:**

**Token Expiration:**
- Access tokens: 15 minutes (short-lived, frequently refreshed)
- Refresh tokens: 7 days (longer-lived, for obtaining new access tokens)
- All tokens MUST have expiration (`exp` claim required)

**Handling Expired Tokens:**
- Catch `ExpiredSignatureError` specifically
- Return 401 with descriptive error message
- Include WWW-Authenticate header with error details
- Client should automatically refresh using refresh token

**Token Refresh Flow:**
1. Extract refresh token from cookie
2. Verify refresh token signature and type
3. Check session not revoked (database lookup by JTI)
4. Check session expiration
5. Generate new access token
6. Update session record with new access token JTI
7. Return new access token

**3. User Isolation Enforcement:**

**Extracting User from Token:**
- Extract token from request (cookie or header)
- Verify token signature and expiration
- Extract user ID from `sub` claim
- Fetch user from database
- Verify user is active
- Return User object

**KN KITCHEN Isolation Model:**
- Per constitution: Single organization, all staff see all orders
- Authentication still required on all routes (prevent anonymous access)
- No row-level permissions needed for staff system
- Example provided for customer-facing isolation (if needed in future)

**Admin Access Control:**
- `require_admin()` dependency checks `is_admin` flag
- Chained after `get_current_user()` dependency
- Admin-only endpoints (user deletion, system config)
- Prevent self-deletion (lockout protection)

**4. Authorization Headers:**

**Header Format:**
```
Authorization: Bearer <token>
```

**Token Extraction:**
- Priority 1: HTTP-only cookie (browser clients)
- Priority 2: Authorization header (API clients, mobile apps)
- Verify "Bearer " prefix (case-insensitive)
- Extract token after "Bearer "
- Raise 401 if no token found in either location

**Frontend Usage:**
- Send token in Authorization header for API clients
- Automatically included via cookies for browser clients
- Never put tokens in URL query parameters (visible in logs)
- Use `credentials: "include"` for cookie support

**5. Token Storage Security:**

**Backend:**
- Never log full tokens (redact from logs)
- Redact Authorization header: `Bearer [REDACTED]`
- Don't include tokens in error messages

**Frontend:**
- Preferred: HTTP-only cookies (not accessible to JavaScript)
- Avoid: localStorage, sessionStorage (vulnerable to XSS)
- Alternative: In-memory storage only (lost on reload)
- Never store in URLs or browser history

**6. JWT Security Checklist:**
- [ ] Signature verification with explicit algorithm
- [ ] Access tokens expire ≤15 minutes
- [ ] All required claims validated
- [ ] User exists and is active
- [ ] Token type checked (access vs refresh)
- [ ] Session revocation via database
- [ ] Strong JWT_SECRET (32+ random chars)
- [ ] HTTPS only in production
- [ ] HTTP-only cookies for storage
- [ ] Tokens redacted from logs
- [ ] Authorization header properly formatted
- [ ] Both cookie and header supported
- [ ] Admin endpoints check is_admin flag
- [ ] User isolation enforced where applicable

**7. Common Vulnerabilities:**

**Algorithm Confusion:**
- Attack: Change alg to "none" to bypass signature
- Mitigation: Explicit algorithm allowlist

**Token Replay:**
- Attack: Reuse intercepted valid token
- Mitigation: Short expiration, HTTPS, session tracking with JTI

**Token Leakage:**
- Attack: Token exposed in logs, URLs, localStorage
- Mitigation: Redact from logs, never in URLs, HTTP-only cookies

**Weak Secret:**
- Attack: Brute-force weak secret to forge tokens
- Mitigation: 64-char random string, environment variable

**No Expiration:**
- Attack: Stolen token valid forever
- Mitigation: Always set exp claim

**8. Testing:**
- Test expired token rejection
- Test tampered token rejection
- Test wrong token type rejection
- Test missing claims rejection
- Use pytest with fixtures for token generation

## Outcome

- ✅ Impact: Established comprehensive JWT security patterns preventing common vulnerabilities (algorithm confusion, token replay, leakage, weak secrets, missing expiration)
- 🧪 Tests: Testing patterns included for token verification
- 📁 Files: Created .claude/skills/jwt-security.md (723 lines)
- 🔁 Next prompts: Reference during auth implementation, validate security in code reviews
- 🧠 Reflection: Skill provides deep security focus on JWT-specific concerns complementing Better Auth skill, with detailed vulnerability explanations and mitigation strategies

## Evaluation notes (flywheel)

- Failure modes observed: None (initial creation)
- Graders run and results (PASS/FAIL): Will be validated during JWT implementation and security audit
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Test token verification and expiry handling during first auth implementation, validate against OWASP JWT security guidelines
