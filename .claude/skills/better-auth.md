---
name: Better Auth Integration
description: Best practices for Better Auth including signup/signin flows, session handling, JWT issuing, and secure frontend usage
scope: mandatory
applies_to: backend, frontend
---

# Better Auth Integration

**Status**: MANDATORY - All authentication MUST follow these patterns

## Overview

Better Auth is a TypeScript-first authentication library that provides secure session management, JWT tokens, and flexible authentication flows. KN KITCHEN uses Better Auth for all user authentication.

**Key Features:**
- Session-based authentication with JWT tokens
- Secure cookie handling
- Token refresh mechanisms
- Type-safe API (TypeScript)
- Database session storage

**Stack Integration:**
- Backend: FastAPI (Python) with JWT validation
- Frontend: Next.js (TypeScript) with Better Auth client
- Database: PostgreSQL (sessions stored in database)

## Core Principles

1. **JWT + Session Hybrid**: JWT tokens for stateless auth, database sessions for revocation
2. **HTTP-Only Cookies**: Store tokens in secure, HTTP-only cookies
3. **Token Refresh**: Automatic refresh before expiration
4. **CSRF Protection**: CSRF tokens for state-changing operations
5. **Type Safety**: Use generated types for auth state

## 1. Backend Setup (FastAPI)

Better Auth is TypeScript-native, but we integrate with FastAPI for the KN KITCHEN backend.

### JWT Token Configuration

```python
# ✅ CORRECT: JWT setup for Better Auth compatibility
# backend/src/auth/config.py
from pydantic import BaseSettings
import os

class AuthSettings(BaseSettings):
    """Authentication configuration"""

    # JWT settings
    jwt_secret: str = os.getenv("JWT_SECRET")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15  # Short-lived access token
    refresh_token_expire_days: int = 7     # Longer-lived refresh token

    # Cookie settings
    cookie_name: str = "kn_kitchen_token"
    cookie_secure: bool = True  # HTTPS only in production
    cookie_httponly: bool = True  # Prevent XSS access
    cookie_samesite: str = "lax"  # CSRF protection

    # Password hashing
    bcrypt_rounds: int = 12

    # Session settings
    session_expire_hours: int = 24

    class Config:
        env_file = ".env"

auth_settings = AuthSettings()
```

### User Model

```python
# ✅ CORRECT: User model with secure password handling
# backend/src/models/user.py
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(SQLModel, table=True):
    """User account"""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255, nullable=False)
    hashed_password: str = Field(max_length=255, nullable=False)
    full_name: str = Field(max_length=255, nullable=False)
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = None

    def verify_password(self, plain_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, self.hashed_password)

    @staticmethod
    def hash_password(plain_password: str) -> str:
        """Hash password for storage"""
        return pwd_context.hash(plain_password)

    class Config:
        # Don't expose password in serialization
        fields_exclude = {"hashed_password"}

class Session(SQLModel, table=True):
    """User session for token revocation"""
    __tablename__ = "sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True, nullable=False)
    token_jti: str = Field(unique=True, index=True, max_length=255)  # JWT ID
    refresh_token_jti: Optional[str] = Field(unique=True, index=True, max_length=255)
    expires_at: datetime = Field(nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = Field(max_length=45)
    user_agent: Optional[str] = Field(max_length=500)
```

### JWT Token Generation

```python
# ✅ CORRECT: JWT token creation with JTI for revocation
# backend/src/auth/jwt.py
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
import uuid

def create_access_token(
    user_id: int,
    expires_delta: Optional[timedelta] = None
) -> tuple[str, str]:
    """
    Create JWT access token

    Returns:
        (token, jti): Token string and unique JWT ID
    """
    if expires_delta is None:
        expires_delta = timedelta(minutes=auth_settings.access_token_expire_minutes)

    expire = datetime.utcnow() + expires_delta
    jti = str(uuid.uuid4())  # Unique token ID for revocation

    payload = {
        "sub": str(user_id),  # Subject (user ID)
        "exp": expire,        # Expiration
        "iat": datetime.utcnow(),  # Issued at
        "jti": jti,          # JWT ID (for revocation)
        "type": "access"     # Token type
    }

    token = jwt.encode(
        payload,
        auth_settings.jwt_secret,
        algorithm=auth_settings.jwt_algorithm
    )

    return token, jti

def create_refresh_token(user_id: int) -> tuple[str, str]:
    """
    Create JWT refresh token (longer expiration)

    Returns:
        (token, jti): Token string and unique JWT ID
    """
    expires_delta = timedelta(days=auth_settings.refresh_token_expire_days)
    expire = datetime.utcnow() + expires_delta
    jti = str(uuid.uuid4())

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": jti,
        "type": "refresh"  # Distinguish from access tokens
    }

    token = jwt.encode(
        payload,
        auth_settings.jwt_secret,
        algorithm=auth_settings.jwt_algorithm
    )

    return token, jti

def verify_token(token: str, token_type: str = "access") -> Dict:
    """
    Verify and decode JWT token

    Args:
        token: JWT token string
        token_type: Expected token type ("access" or "refresh")

    Returns:
        Decoded payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    from fastapi import HTTPException

    try:
        payload = jwt.decode(
            token,
            auth_settings.jwt_secret,
            algorithms=[auth_settings.jwt_algorithm]
        )

        # Verify token type
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token type. Expected {token_type}"
            )

        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )
```

### Authentication Routes

```python
# ✅ CORRECT: Signup/Signin endpoints
# backend/src/api/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.security import HTTPBearer
from sqlmodel import Session, select
from typing import Annotated
from datetime import datetime, timedelta

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# --- DTOs ---
from pydantic import BaseModel, EmailStr, Field

class SignupRequest(BaseModel):
    """User signup request"""
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)

class SigninRequest(BaseModel):
    """User signin request"""
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """Token response (only for non-cookie clients)"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    """User profile response"""
    id: int
    email: str
    full_name: str
    is_admin: bool
    created_at: datetime
    last_login_at: Optional[datetime]

# --- Signup Flow ---
@router.post("/signup", response_model=UserResponse, status_code=201)
async def signup(
    request: SignupRequest,
    response: Response,
    http_request: Request,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Create new user account

    - Validates email uniqueness
    - Hashes password securely
    - Creates user and session
    - Issues JWT tokens in HTTP-only cookies
    """
    # Check if email already exists
    existing = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create user
    user = User(
        email=request.email,
        hashed_password=User.hash_password(request.password),
        full_name=request.full_name,
        last_login_at=datetime.utcnow()
    )

    session.add(user)
    session.flush()  # Get user.id

    # Generate tokens
    access_token, access_jti = create_access_token(user.id)
    refresh_token, refresh_jti = create_refresh_token(user.id)

    # Store session in database (for revocation)
    db_session = Session(
        user_id=user.id,
        token_jti=access_jti,
        refresh_token_jti=refresh_jti,
        expires_at=datetime.utcnow() + timedelta(hours=auth_settings.session_expire_hours),
        ip_address=http_request.client.host,
        user_agent=http_request.headers.get("user-agent")
    )

    session.add(db_session)
    session.commit()
    session.refresh(user)

    # Set HTTP-only cookies
    _set_auth_cookies(response, access_token, refresh_token)

    return user

# --- Signin Flow ---
@router.post("/signin", response_model=UserResponse)
async def signin(
    request: SigninRequest,
    response: Response,
    http_request: Request,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Authenticate user and issue tokens

    - Verifies email and password
    - Issues new JWT tokens
    - Creates session record
    """
    # Find user by email
    user = session.exec(
        select(User).where(User.email == request.email)
    ).first()

    if not user or not user.verify_password(request.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive"
        )

    # Update last login
    user.last_login_at = datetime.utcnow()

    # Generate tokens
    access_token, access_jti = create_access_token(user.id)
    refresh_token, refresh_jti = create_refresh_token(user.id)

    # Store session
    db_session = Session(
        user_id=user.id,
        token_jti=access_jti,
        refresh_token_jti=refresh_jti,
        expires_at=datetime.utcnow() + timedelta(hours=auth_settings.session_expire_hours),
        ip_address=http_request.client.host,
        user_agent=http_request.headers.get("user-agent")
    )

    session.add(db_session)
    session.commit()
    session.refresh(user)

    # Set cookies
    _set_auth_cookies(response, access_token, refresh_token)

    return user

# --- Signout Flow ---
@router.post("/signout")
async def signout(
    response: Response,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)]
):
    """
    Sign out user and revoke session

    - Deletes session from database
    - Clears auth cookies
    """
    # Get token JTI from request (would need to extract from cookie/header)
    # For simplicity, delete all sessions for this user
    # In production, delete specific session by JTI

    sessions = session.exec(
        select(Session).where(Session.user_id == current_user.id)
    ).all()

    for user_session in sessions:
        session.delete(user_session)

    session.commit()

    # Clear cookies
    response.delete_cookie(auth_settings.cookie_name)
    response.delete_cookie(f"{auth_settings.cookie_name}_refresh")

    return {"message": "Signed out successfully"}

# --- Token Refresh ---
@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)]
):
    """
    Refresh access token using refresh token

    - Verifies refresh token
    - Issues new access token
    - Updates session record
    """
    # Extract refresh token from cookie
    refresh_token = request.cookies.get(f"{auth_settings.cookie_name}_refresh")

    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Refresh token not found"
        )

    # Verify refresh token
    try:
        payload = verify_token(refresh_token, token_type="refresh")
    except HTTPException:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token"
        )

    user_id = int(payload["sub"])
    refresh_jti = payload["jti"]

    # Verify session exists in database (not revoked)
    db_session = session.exec(
        select(Session).where(Session.refresh_token_jti == refresh_jti)
    ).first()

    if not db_session:
        raise HTTPException(
            status_code=401,
            detail="Session has been revoked"
        )

    # Generate new access token
    access_token, access_jti = create_access_token(user_id)

    # Update session
    db_session.token_jti = access_jti
    db_session.last_accessed_at = datetime.utcnow()
    session.add(db_session)
    session.commit()

    # Set new access token cookie
    response.set_cookie(
        key=auth_settings.cookie_name,
        value=access_token,
        max_age=auth_settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=auth_settings.cookie_secure,
        samesite=auth_settings.cookie_samesite
    )

    return {"message": "Token refreshed successfully"}

# --- Helper Functions ---
def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set authentication cookies"""
    # Access token cookie (short-lived)
    response.set_cookie(
        key=auth_settings.cookie_name,
        value=access_token,
        max_age=auth_settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=auth_settings.cookie_secure,
        samesite=auth_settings.cookie_samesite
    )

    # Refresh token cookie (longer-lived)
    response.set_cookie(
        key=f"{auth_settings.cookie_name}_refresh",
        value=refresh_token,
        max_age=auth_settings.refresh_token_expire_days * 24 * 60 * 60,
        httponly=True,
        secure=auth_settings.cookie_secure,
        samesite=auth_settings.cookie_samesite
    )
```

### Authentication Dependency

```python
# ✅ CORRECT: Get current user from JWT token
# backend/src/api/dependencies.py
from fastapi import Depends, HTTPException, Request
from typing import Annotated

async def get_current_user(
    request: Request,
    session: Annotated[Session, Depends(get_session)]
) -> User:
    """
    Extract and validate current user from JWT token

    - Reads token from cookie or Authorization header
    - Validates token signature and expiration
    - Checks session hasn't been revoked
    - Returns User object
    """
    # Try cookie first, then Authorization header
    token = request.cookies.get(auth_settings.cookie_name)

    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    # Verify token
    try:
        payload = verify_token(token, token_type="access")
    except HTTPException:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user_id = int(payload["sub"])
    token_jti = payload["jti"]

    # Verify session hasn't been revoked
    db_session = session.exec(
        select(Session).where(Session.token_jti == token_jti)
    ).first()

    if not db_session:
        raise HTTPException(
            status_code=401,
            detail="Session has been revoked"
        )

    # Check session expiration
    if db_session.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=401,
            detail="Session has expired"
        )

    # Get user
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive"
        )

    return user

async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Require admin role"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )
    return current_user
```

## 2. Frontend Integration (Next.js)

### Better Auth Client Setup

```typescript
// ✅ CORRECT: Better Auth client configuration
// frontend/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  credentials: "include", // Send cookies with requests
});

// Type-safe auth hooks
export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient;
```

### Authentication Context

```typescript
// ✅ CORRECT: Auth context provider
// frontend/src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        credentials: "include", // Send cookies
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Sign in failed");
    }

    const userData = await response.json();
    setUser(userData);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, full_name: fullName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Sign up failed");
    }

    const userData = await response.json();
    setUser(userData);
  };

  const signOut = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signout`, {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### Protected Routes

```typescript
// ✅ CORRECT: Protected route component
// frontend/src/components/ProtectedRoute.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// Usage in page
// frontend/src/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Dashboard content...</div>
    </ProtectedRoute>
  );
}
```

### Login Form

```typescript
// ✅ CORRECT: Login form with error handling
// frontend/src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sign In</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="mb-6">
        <label className="block mb-2">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

### Token Refresh Interceptor

```typescript
// ✅ CORRECT: Automatic token refresh
// frontend/src/lib/api-client.ts

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Token refresh failed");
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });

  // If 401, try refreshing token once
  if (response.status === 401 && !isRefreshing) {
    if (!refreshPromise) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken()
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;

      // Retry original request with refreshed token
      const retryResponse = await fetch(url, {
        ...options,
        credentials: "include",
      });

      if (!retryResponse.ok) {
        throw new Error(`Request failed: ${retryResponse.statusText}`);
      }

      return retryResponse.json();
    } catch (error) {
      // Refresh failed, redirect to login
      window.location.href = "/login";
      throw error;
    }
  }

  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }

  return response.json();
}
```

## Security Best Practices

### Password Requirements

```python
# ✅ CORRECT: Password validation
from pydantic import validator
import re

class SignupRequest(BaseModel):
    password: str = Field(min_length=8, max_length=100)

    @validator("password")
    def validate_password_strength(cls, v):
        """Enforce password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")

        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain uppercase letter")

        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain lowercase letter")

        if not re.search(r"\d", v):
            raise ValueError("Password must contain number")

        return v
```

### Rate Limiting

```python
# ✅ CORRECT: Rate limit auth endpoints
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/signin")
@limiter.limit("5/minute")  # 5 attempts per minute
async def signin(...):
    pass

@router.post("/signup")
@limiter.limit("3/hour")  # 3 signups per hour per IP
async def signup(...):
    pass
```

### CORS Configuration

```python
# ✅ CORRECT: CORS for auth
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://kn-kitchen.com"],
    allow_credentials=True,  # Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Best Practices Checklist

- [ ] **HTTP-Only Cookies**: Tokens stored in HTTP-only cookies
- [ ] **Secure Cookies**: `cookie_secure=True` in production (HTTPS)
- [ ] **SameSite Protection**: `cookie_samesite="lax"` for CSRF protection
- [ ] **Short Access Tokens**: 15-minute expiration for access tokens
- [ ] **Long Refresh Tokens**: 7-day expiration for refresh tokens
- [ ] **Session Revocation**: Database sessions for logout/revocation
- [ ] **Password Hashing**: bcrypt with 12 rounds minimum
- [ ] **Password Strength**: Enforce length, complexity requirements
- [ ] **Rate Limiting**: Limit auth endpoints (5 signin/min, 3 signup/hour)
- [ ] **Token Refresh**: Automatic refresh before expiration
- [ ] **CORS Configured**: Allow credentials, specific origins only
- [ ] **HTTPS Only**: All auth in production uses HTTPS

## Reference Documents

- Constitution: `.specify/memory/constitution.md` (Auth requirements)
- FastAPI Backend: `.claude/skills/fastapi-backend.md` (Dependencies)
- System Architecture: `.claude/skills/system-architecture.md` (Frontend/backend separation)

---

**Remember**: Authentication is security-critical. Use HTTP-only cookies, short-lived tokens, database session storage for revocation, and enforce strong password policies.
