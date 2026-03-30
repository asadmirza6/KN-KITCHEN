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

def hash_password(password: str) -> str:
    # Bcrypt ki jagah SHA-256 use kar rahe hain (No length limit)
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=settings.jwt_expire_days))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.better_auth_secret, algorithm=settings.jwt_algorithm)

def verify_jwt(credentials: HTTPAuthorizationCredentials = Depends(security), session: Session = Depends(get_session)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, settings.better_auth_secret, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401)
    except JWTError: raise HTTPException(status_code=401)
    
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None: raise HTTPException(status_code=401)
    return user