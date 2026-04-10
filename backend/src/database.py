"""
Database connection and session management using SQLModel.
Connects to Neon PostgreSQL with SSL mode required.
"""

from sqlmodel import create_engine, Session, SQLModel
from typing import Generator
from .config import settings
import logging

logger = logging.getLogger(__name__)

# Create SQLModel engine with Neon PostgreSQL
# SSL mode is required for Neon connections
engine = create_engine(
    settings.database_url,
    echo=True,  # Set to False in production
    connect_args={"sslmode": "require"}  # Required for Neon
)


def create_db_and_tables():
    """
    Create all database tables and synchronize schema.
    Call this on app startup.
    """
    # Import all models to register them with SQLModel.metadata
    from .models import User, Order, Item, MediaAsset, Album, Quotation

    try:
        # Create tables from SQLModel definitions
        SQLModel.metadata.create_all(engine)
        logger.info("[DB] ✓ SQLModel tables created/verified")
    except Exception as e:
        logger.error(f"[DB] ✗ Error creating tables: {str(e)}")

    # Run schema synchronization to add any missing columns
    try:
        from .utils.schema_sync import check_and_fix_schema, validate_schema

        # Check and fix schema
        check_and_fix_schema(engine)

        # Validate schema
        is_valid, missing = validate_schema(engine)
        if is_valid:
            logger.info("[DB] ✓ Schema validation passed - all required columns exist")
        else:
            logger.warning(f"[DB] ⚠ Missing columns after sync: {missing}")

    except Exception as e:
        logger.error(f"[DB] ✗ Error during schema synchronization: {str(e)}")


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
