import hashlib
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlmodel import Session, select

from ..config import settings
from ..database import get_session
from ..models import User

security = HTTPBearer()

# Naya Simple Hashing Function (Bcrypt ki zaroorat nahi)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Dono ko SHA-256 se compare karein
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=settings.jwt_expire_days))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.better_auth_secret, algorithm=settings.jwt_algorithm)

# ... baaki verify_jwt aur require_admin functions wahi rehne dein jo pehle thay ...