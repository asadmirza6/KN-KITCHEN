"""
Main FastAPI application entry point.
Configures CORS, routes, and database connection.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from .config import settings
from .database import engine, get_session
import os


# Create FastAPI app
app = FastAPI(
    title="KN KITCHEN API",
    description="Neon PostgreSQL Full-Stack Application API",
    version="1.0.0"
)


# Startup event: Validate environment variables
@app.on_event("startup")
async def startup_validation():
    """Validate required environment variables on startup."""
    import os
    from .utils.cloudinary_config import CLOUDINARY_CONFIGURED

    print("\n" + "="*60)
    print("KN KITCHEN API - Startup Validation")
    print("="*60)

    # Check database
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        print("[OK] DATABASE_URL is set")
    else:
        print("[ERROR] DATABASE_URL is NOT set - Database will not work!")

    # Check JWT secret
    jwt_secret = os.getenv("BETTER_AUTH_SECRET")
    if jwt_secret and len(jwt_secret) >= 32:
        print("[OK] BETTER_AUTH_SECRET is set")
    else:
        print("[WARN] BETTER_AUTH_SECRET is weak or not set - Authentication may be insecure!")

    # Check Cloudinary
    if CLOUDINARY_CONFIGURED:
        print("[OK] Cloudinary is configured - Image uploads enabled")
    else:
        print("[WARN] Cloudinary NOT configured - Image uploads will fail")
        print("  -> Items can be created without images")
        print("  -> Gallery and banners require Cloudinary")
        print("  -> See CLOUDINARY_SETUP.md for instructions")

    print("="*60 + "\n")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount uploads directory as static files
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
if os.path.exists(uploads_dir):
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
def health_check(session: Session = Depends(get_session)):
    """
    Health check endpoint that verifies database connectivity.

    Returns:
        dict: Status and database connection info
    """
    try:
        # Test database connection with a simple query
        session.exec(select(1))
        return {
            "status": "healthy",
            "database": "connected",
            "message": "API and database are operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "KN KITCHEN API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Import and mount routers
from .api import auth, items, media, orders, users, albums

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(items.router, prefix="/items", tags=["Items"])
app.include_router(media.router, prefix="/media", tags=["Media"])
app.include_router(albums.router, prefix="/albums", tags=["Albums"])
app.include_router(orders.router, prefix="/orders", tags=["Orders"])
app.include_router(users.router, prefix="/users", tags=["Users"])
