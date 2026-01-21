"""
Database connection and session management using SQLModel.
Connects to Neon PostgreSQL with SSL mode required.
"""

from sqlmodel import create_engine, Session, SQLModel
from typing import Generator
from .config import settings


# Create SQLModel engine with Neon PostgreSQL
# SSL mode is required for Neon connections
engine = create_engine(
    settings.database_url,
    echo=True,  # Set to False in production
    connect_args={"sslmode": "require"}  # Required for Neon
)


def create_db_and_tables():
    """Create all database tables. Call this on app startup."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI routes.
    Provides a database session that automatically closes after use.

    Usage:
        @app.get("/items")
        def read_items(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session
