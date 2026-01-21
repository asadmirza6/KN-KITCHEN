---
name: JWT Security
description: Best practices for JWT token verification, expiry handling, user isolation enforcement, and authorization headers
scope: mandatory
applies_to: backend, frontend
---

# JWT Security

**Status**: MANDATORY - All JWT handling MUST follow these security patterns

## Overview

JSON Web Tokens (JWT) provide stateless authentication for KN KITCHEN. Proper JWT security is critical to prevent unauthorized access, token manipulation, and security vulnerabilities.

**JWT Structure:**
```
header.payload.signature
```

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJleHAiOjE2NzY1NDMyMTB9.signature
```

**Security Requirements:**
- Verify signature on every request
- Check expiration before processing
- Validate all claims (sub, exp, iat, jti)
- Enforce user isolation (users can only access their own data)
- Use secure algorithms (HS256, RS256)

## Core Principles

1. **Always Verify**: Never trust token claims without signature verification
2. **Check Expiration**: Expired tokens MUST be rejected
3. **Validate Claims**: Verify all required claims are present and valid
4. **Secure Storage**: Never log or expose tokens
5. **User Isolation**: User ID from token determines data access

## 1. Token Verification

All JWTs MUST be verified before processing. Verification includes signature validation and claims checking.

### Signature Verification

```python
# ✅ CORRECT: Verify JWT signature
# backend/src/auth/jwt.py
from jose import JWTError, jwt
from fastapi import HTTPException
from typing import Dict
import os

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

def verify_token(token: str, expected_type: str = "access") -> Dict:
    """
    Verify JWT token signature and claims

    Args:
        token: JWT token string
        expected_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded payload dictionary

    Raises:
        HTTPException: If token is invalid, expired, or wrong type

    Security checks:
    1. Signature verification (prevents tampering)
    2. Expiration check (prevents replay attacks)
    3. Token type validation (prevents token confusion)
    4. Required claims validation
    """
    try:
        # Decode and verify signature
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        # Verify token type
        token_type = payload.get("type")
        if token_type != expected_type:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token type. Expected '{expected_type}', got '{token_type}'"
            )

        # Verify required claims exist
        required_claims = ["sub", "exp", "iat", "jti", "type"]
        missing_claims = [claim for claim in required_claims if claim not in payload]

        if missing_claims:
            raise HTTPException(
                status_code=401,
                detail=f"Token missing required claims: {', '.join(missing_claims)}"
            )

        # Additional validation
        user_id = payload.get("sub")
        if not user_id or not user_id.isdigit():
            raise HTTPException(
                status_code=401,
                detail="Invalid user ID in token"
            )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        # Catch-all for unexpected errors
        raise HTTPException(
            status_code=401,
            detail="Token verification failed"
        )
```

```python
# ❌ WRONG: No signature verification
def verify_token_insecure(token: str) -> Dict:
    """INSECURE: Don't do this!"""
    # Decoding without verification allows token manipulation
    payload = jwt.decode(token, options={"verify_signature": False})
    return payload  # Attacker can forge tokens!
```

### Algorithm Confusion Prevention

```python
# ✅ CORRECT: Explicitly specify allowed algorithms
def verify_token_secure(token: str) -> Dict:
    """Verify with explicit algorithm allowlist"""
    # Only allow HS256 (symmetric) or RS256 (asymmetric)
    ALLOWED_ALGORITHMS = ["HS256"]

    payload = jwt.decode(
        token,
        JWT_SECRET,
        algorithms=ALLOWED_ALGORITHMS  # Prevent algorithm confusion attacks
    )
    return payload

# ❌ WRONG: Using 'none' algorithm or not specifying
def verify_token_vulnerable(token: str) -> Dict:
    """VULNERABLE to algorithm confusion"""
    # Attacker can change algorithm to 'none' and bypass signature
    payload = jwt.decode(token, JWT_SECRET)  # Infers algorithm from token header!
    return payload
```

### Claim Validation

```python
# ✅ CORRECT: Validate all claims
from datetime import datetime

def validate_token_claims(payload: Dict) -> bool:
    """
    Validate JWT claims beyond signature verification

    Checks:
    - 'sub' (subject/user_id) is present and valid
    - 'exp' (expiration) is in the future
    - 'iat' (issued at) is not in the future
    - 'jti' (JWT ID) is present (for revocation tracking)
    - 'type' matches expected type
    """
    # Check subject (user ID)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user ID claim")

    try:
        user_id_int = int(user_id)
        if user_id_int <= 0:
            raise ValueError("Invalid user ID")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID format")

    # Check expiration (already checked by jwt.decode, but double-check)
    exp = payload.get("exp")
    if not exp or datetime.utcfromtimestamp(exp) < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Token expired")

    # Check issued at (prevent future-dated tokens)
    iat = payload.get("iat")
    if not iat or datetime.utcfromtimestamp(iat) > datetime.utcnow():
        raise HTTPException(status_code=401, detail="Token issued in the future")

    # Check JWT ID (for revocation)
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Missing JWT ID")

    return True
```

## 2. Expiry Handling

Tokens MUST have expiration times. Expired tokens MUST be rejected.

### Token Expiration Configuration

```python
# ✅ CORRECT: Short-lived access tokens
from datetime import datetime, timedelta

# Access tokens: 15 minutes (short-lived, frequently refreshed)
ACCESS_TOKEN_EXPIRE_MINUTES = 15

# Refresh tokens: 7 days (longer-lived, for obtaining new access tokens)
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(user_id: int) -> tuple[str, str]:
    """
    Create short-lived access token

    Returns:
        (token, jti): JWT string and unique ID
    """
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = str(uuid.uuid4())

    payload = {
        "sub": str(user_id),
        "exp": expire,  # REQUIRED: Token expiration
        "iat": datetime.utcnow(),  # REQUIRED: Issued at
        "jti": jti,  # REQUIRED: JWT ID for revocation
        "type": "access"
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, jti
```

```python
# ❌ WRONG: No expiration or very long expiration
def create_token_insecure(user_id: int) -> str:
    """INSECURE: Token never expires"""
    payload = {
        "sub": str(user_id),
        # Missing 'exp' - token is valid forever!
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_token_too_long(user_id: int) -> str:
    """INSECURE: 1 year expiration"""
    expire = datetime.utcnow() + timedelta(days=365)  # Too long!
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
```

### Handling Expired Tokens

```python
# ✅ CORRECT: Reject expired tokens, return specific error
from jose import jwt, ExpiredSignatureError

@router.get("/protected-resource")
async def get_resource(
    request: Request,
    session: Annotated[Session, Depends(get_session)]
):
    """Protected endpoint with expiry handling"""
    token = extract_token_from_request(request)

    try:
        payload = verify_token(token, expected_type="access")
        user_id = int(payload["sub"])
        # Process request...

    except ExpiredSignatureError:
        # Token expired - client should refresh
        raise HTTPException(
            status_code=401,
            detail="Access token expired. Please refresh.",
            headers={
                "WWW-Authenticate": 'Bearer error="invalid_token", error_description="The access token expired"'
            }
        )
    except JWTError:
        # Other JWT errors
        raise HTTPException(
            status_code=401,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"}
        )
```

### Token Refresh Flow

```python
# ✅ CORRECT: Refresh token validation
@router.post("/auth/refresh")
async def refresh_access_token(
    request: Request,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Refresh access token using refresh token

    Security checks:
    1. Verify refresh token signature
    2. Check expiration
    3. Verify token type is 'refresh'
    4. Check session not revoked (database lookup)
    5. Issue new access token
    """
    # Extract refresh token from cookie
    refresh_token = request.cookies.get("kn_kitchen_token_refresh")

    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token not found"
        )

    # Verify refresh token
    try:
        payload = verify_token(refresh_token, expected_type="refresh")
    except HTTPException as e:
        # Refresh token expired or invalid - user must re-authenticate
        raise HTTPException(
            status_code=401,
            detail="Refresh token expired. Please sign in again."
        )

    user_id = int(payload["sub"])
    refresh_jti = payload["jti"]

    # Verify session hasn't been revoked
    db_session = session.exec(
        select(Session).where(Session.refresh_token_jti == refresh_jti)
    ).first()

    if not db_session:
        raise HTTPException(
            status_code=401,
            detail="Session revoked. Please sign in again."
        )

    # Check session expiration
    if db_session.expires_at < datetime.utcnow():
        session.delete(db_session)
        session.commit()
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please sign in again."
        )

    # Generate new access token
    new_access_token, new_access_jti = create_access_token(user_id)

    # Update session with new access token JTI
    db_session.token_jti = new_access_jti
    db_session.last_accessed_at = datetime.utcnow()
    session.add(db_session)
    session.commit()

    return {"access_token": new_access_token, "token_type": "bearer"}
```

## 3. User Isolation Enforcement

The user ID in the JWT token MUST determine data access. Users can only access their own data (per KN KITCHEN constitution: single organization, no row-level permissions, but authentication required).

### Extracting User from Token

```python
# ✅ CORRECT: Extract and validate user from token
async def get_current_user(
    request: Request,
    session: Annotated[Session, Depends(get_session)]
) -> User:
    """
    Extract current user from JWT token

    Security:
    1. Extract token from Authorization header or cookie
    2. Verify token signature and expiration
    3. Extract user ID from 'sub' claim
    4. Fetch user from database
    5. Verify user is active
    """
    token = extract_token_from_request(request)

    # Verify token
    payload = verify_token(token, expected_type="access")

    # Extract user ID
    user_id = int(payload["sub"])

    # Fetch user from database
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="User account is inactive"
        )

    return user
```

### Enforcing User Isolation

```python
# ✅ CORRECT: User can only access their own orders
@router.get("/orders/{order_id}")
async def get_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Get order by ID

    Security: In KN KITCHEN, all staff see all orders (no row-level isolation).
    Authentication is still required to prevent anonymous access.
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Per constitution: All authenticated users can see all orders
    # (Single organization, staff-only system)
    return order

# If the system had customer portals (which it doesn't per constitution):
# ✅ EXAMPLE: Row-level isolation (if needed in future)
@router.get("/my-orders/{order_id}")
async def get_my_order(
    order_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Get order - only if it belongs to current user

    This pattern would be used if customers had accounts.
    """
    order = session.get(Order, order_id)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Enforce ownership
    if order.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only view your own orders"
        )

    return order
```

### Admin Access Control

```python
# ✅ CORRECT: Admin-only endpoints
async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Require admin role

    Checks:
    1. User is authenticated (via get_current_user dependency)
    2. User has is_admin flag set
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user: Annotated[User, Depends(require_admin)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Delete user - admin only

    Security:
    1. User must be authenticated
    2. User must have admin role
    3. Cannot delete yourself (prevent lockout)
    """
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session.delete(user)
    session.commit()

    return {"message": "User deleted successfully"}
```

## 4. Authorization Headers

JWTs should be sent in the `Authorization` header using the Bearer scheme, or in HTTP-only cookies.

### Header Format

```
Authorization: Bearer <token>
```

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Extracting Token from Request

```python
# ✅ CORRECT: Extract token from header or cookie
from fastapi import Request, HTTPException

def extract_token_from_request(request: Request) -> str:
    """
    Extract JWT token from request

    Priority:
    1. HTTP-only cookie (preferred for browser clients)
    2. Authorization header (for API clients, mobile apps)

    Returns:
        Token string

    Raises:
        HTTPException: If no token found
    """
    # Try cookie first (browser clients)
    token = request.cookies.get("kn_kitchen_token")

    if token:
        return token

    # Try Authorization header (API clients)
    auth_header = request.headers.get("Authorization")

    if auth_header:
        # Verify Bearer scheme
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization header format. Expected 'Bearer <token>'"
            )

        # Extract token (everything after "Bearer ")
        token = auth_header[7:]  # len("Bearer ") = 7

        if not token:
            raise HTTPException(
                status_code=401,
                detail="Authorization header is empty"
            )

        return token

    # No token found
    raise HTTPException(
        status_code=401,
        detail="Not authenticated. Provide token in cookie or Authorization header.",
        headers={"WWW-Authenticate": "Bearer"}
    )
```

```python
# ❌ WRONG: Only check header, ignore cookie
def extract_token_header_only(request: Request) -> str:
    """INCOMPLETE: Doesn't support cookie-based auth"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auth_header.replace("Bearer ", "")

# ❌ WRONG: Case-sensitive check
def extract_token_case_sensitive(request: Request) -> str:
    """FRAGILE: Some clients send 'bearer' lowercase"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return auth_header[7:]
```

### Frontend Authorization Header Usage

```typescript
// ✅ CORRECT: Send token in Authorization header (API clients)
// frontend/src/lib/api-client.ts

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken(); // From storage or cookie

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Send cookies
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Usage
const orders = await apiRequest<Order[]>("/api/orders");
```

```typescript
// ❌ WRONG: Token in query string
async function apiRequestInsecure(endpoint: string) {
  const token = getAccessToken();
  // NEVER put tokens in URL - visible in logs, browser history, referrer headers
  const response = await fetch(`${API_URL}${endpoint}?token=${token}`);
  return response.json();
}
```

## 5. Token Storage Security

### Backend: Never Log Tokens

```python
# ✅ CORRECT: Redact tokens from logs
import logging

logger = logging.getLogger(__name__)

def log_request(request: Request):
    """Log request details without exposing token"""
    headers = dict(request.headers)

    # Redact authorization header
    if "authorization" in headers:
        headers["authorization"] = "Bearer [REDACTED]"

    logger.info(f"Request: {request.method} {request.url.path}", extra={
        "headers": headers,
        "ip": request.client.host
    })

# ❌ WRONG: Logging full headers
def log_request_insecure(request: Request):
    """INSECURE: Exposes tokens in logs"""
    logger.info(f"Request headers: {request.headers}")  # Token visible!
```

### Frontend: Secure Token Storage

```typescript
// ✅ CORRECT: Use HTTP-only cookies (preferred)
// Tokens are stored by browser, not accessible to JavaScript
// Set by backend with Set-Cookie header

// ❌ WRONG: localStorage or sessionStorage
function storeTokenInsecure(token: string) {
  // Vulnerable to XSS attacks - JavaScript can steal token
  localStorage.setItem("token", token);  // Don't do this!
  sessionStorage.setItem("token", token);  // Don't do this!
}

// If you must use JavaScript storage (mobile apps, etc.):
// ⚠️ LESS SECURE: In-memory storage only
let accessToken: string | null = null;

export function setAccessToken(token: string) {
  // Store in memory only (lost on page reload)
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Cleared on page reload - requires refresh flow
```

## 6. JWT Security Checklist

Before deploying JWT authentication:

- [ ] **Signature Verification**: All tokens verified with `jwt.decode(..., verify=True)`
- [ ] **Algorithm Specified**: Explicit algorithm allowlist (e.g., `algorithms=["HS256"]`)
- [ ] **Expiration Checked**: Access tokens expire in 15 minutes or less
- [ ] **Claims Validated**: All required claims (sub, exp, iat, jti, type) present
- [ ] **User Validation**: User exists and is active before granting access
- [ ] **Token Type Check**: Access vs refresh tokens distinguished and validated
- [ ] **Session Revocation**: Database sessions tracked for logout/revocation
- [ ] **Secure Secret**: JWT_SECRET is strong (32+ random characters), stored in env vars
- [ ] **HTTPS Only**: Tokens only transmitted over HTTPS in production
- [ ] **HTTP-Only Cookies**: Tokens stored in HTTP-only cookies (not localStorage)
- [ ] **No Token Logging**: Tokens redacted from application logs
- [ ] **Authorization Header**: Proper "Bearer <token>" format supported
- [ ] **Cookie + Header**: Support both cookie and Authorization header extraction
- [ ] **Admin Check**: Admin-only endpoints verify is_admin flag
- [ ] **User Isolation**: Data access controlled by user ID from token (where applicable)

## 7. Common Vulnerabilities and Mitigations

### Vulnerability: Algorithm Confusion

**Attack:** Attacker changes algorithm from HS256 to "none", bypassing signature verification.

**Mitigation:**
```python
# ✅ Specify allowed algorithms explicitly
jwt.decode(token, secret, algorithms=["HS256"])  # GOOD

# ❌ Don't let token specify algorithm
jwt.decode(token, secret)  # BAD - infers from token
```

### Vulnerability: Token Replay

**Attack:** Attacker intercepts valid token and reuses it.

**Mitigation:**
- Short token expiration (15 minutes)
- Database session tracking with JTI
- HTTPS only (prevents interception)
- Logout revokes session in database

### Vulnerability: Token Leakage

**Attack:** Token exposed in logs, URLs, or client-side storage.

**Mitigation:**
- Never log full tokens
- Never put tokens in URLs
- Use HTTP-only cookies (not localStorage)
- Redact tokens from error messages

### Vulnerability: Weak Secret

**Attack:** Attacker brute-forces weak JWT secret to forge tokens.

**Mitigation:**
```python
# ✅ Strong secret (32+ random characters)
JWT_SECRET = os.getenv("JWT_SECRET")  # e.g., 64 char random string

# ❌ Weak secret
JWT_SECRET = "password123"  # Easy to crack
```

### Vulnerability: No Expiration

**Attack:** Stolen token is valid indefinitely.

**Mitigation:**
```python
# ✅ Always set expiration
payload = {
    "sub": str(user_id),
    "exp": datetime.utcnow() + timedelta(minutes=15)  # REQUIRED
}

# ❌ No expiration
payload = {"sub": str(user_id)}  # Valid forever!
```

## 8. Testing JWT Security

```python
# ✅ CORRECT: Test token verification
import pytest
from jose import jwt
from datetime import datetime, timedelta

def test_expired_token_rejected():
    """Verify expired tokens are rejected"""
    # Create expired token
    payload = {
        "sub": "123",
        "exp": datetime.utcnow() - timedelta(minutes=1),  # Expired 1 min ago
        "type": "access"
    }
    expired_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    # Should raise exception
    with pytest.raises(HTTPException) as exc:
        verify_token(expired_token)

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()

def test_tampered_token_rejected():
    """Verify tampered tokens are rejected"""
    # Create valid token
    payload = {"sub": "123", "exp": datetime.utcnow() + timedelta(minutes=15)}
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    # Tamper with token (change user ID)
    parts = token.split(".")
    # Modify payload (won't match signature)
    tampered_payload = jwt.encode({"sub": "999"}, JWT_SECRET, algorithm="HS256").split(".")[1]
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

    # Should raise exception
    with pytest.raises(HTTPException) as exc:
        verify_token(tampered_token)

    assert exc.value.status_code == 401

def test_wrong_token_type_rejected():
    """Verify refresh token rejected when access token expected"""
    # Create refresh token
    payload = {
        "sub": "123",
        "exp": datetime.utcnow() + timedelta(days=7),
        "type": "refresh"
    }
    refresh_token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    # Try to use as access token
    with pytest.raises(HTTPException) as exc:
        verify_token(refresh_token, expected_type="access")

    assert exc.value.status_code == 401
    assert "token type" in exc.value.detail.lower()
```

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Authentication requirements)
- Better Auth: `.claude/skills/better-auth.md` (Complete auth implementation)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Dependency injection)

---

**Remember**: JWT security is critical. Always verify signatures, check expiration, validate claims, enforce user isolation, and use HTTP-only cookies. A single security mistake can compromise the entire system.
