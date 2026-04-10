"""
Schema synchronization utility for handling missing columns.
Runs on application startup to ensure database schema matches SQLModel definitions.
"""

from sqlalchemy import text, inspect
from sqlalchemy.exc import ProgrammingError
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


def check_and_fix_schema(engine) -> bool:
    """
    Check if all required columns exist in database tables.
    If columns are missing, add them automatically.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        bool: True if schema is valid or was fixed, False if there are unrecoverable errors
    """

    required_columns = {
        'orders': [
            ('discount', 'NUMERIC(10, 2)', 'DEFAULT 0.00'),
            ('balance', 'NUMERIC(10, 2)', 'NOT NULL'),
        ],
        'quotation': [
            ('discount', 'NUMERIC(10, 2)', 'DEFAULT 0.00'),
            ('balance', 'NUMERIC(10, 2)', 'NOT NULL'),
        ]
    }

    try:
        with engine.connect() as connection:
            inspector = inspect(engine)

            # Check each table
            for table_name, columns_to_check in required_columns.items():
                if table_name not in inspector.get_table_names():
                    logger.warning(f"[SCHEMA] Table '{table_name}' does not exist yet")
                    continue

                existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
                logger.info(f"[SCHEMA] Table '{table_name}' has columns: {sorted(existing_columns)}")

                # Check for missing columns
                for col_name, col_type, col_constraint in columns_to_check:
                    if col_name not in existing_columns:
                        logger.warning(f"[SCHEMA] Missing column '{col_name}' in table '{table_name}'")
                        try:
                            # Add the missing column
                            sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type} {col_constraint}"
                            connection.execute(text(sql))
                            connection.commit()
                            logger.info(f"[SCHEMA] ✓ Added column '{col_name}' to table '{table_name}'")
                        except ProgrammingError as e:
                            logger.error(f"[SCHEMA] ✗ Failed to add column '{col_name}' to '{table_name}': {str(e)}")
                            connection.rollback()
                    else:
                        logger.info(f"[SCHEMA] ✓ Column '{col_name}' exists in table '{table_name}'")

            logger.info("[SCHEMA] Schema synchronization complete")
            return True

    except Exception as e:
        logger.error(f"[SCHEMA] Error during schema check: {str(e)}")
        return False


def validate_schema(engine) -> Tuple[bool, List[str]]:
    """
    Validate that all required columns exist.

    Args:
        engine: SQLAlchemy engine instance

    Returns:
        Tuple of (is_valid, list_of_missing_columns)
    """

    required_columns = {
        'orders': ['discount', 'balance'],
        'quotation': ['discount', 'balance']
    }

    missing = []

    try:
        inspector = inspect(engine)

        for table_name, columns_to_check in required_columns.items():
            if table_name not in inspector.get_table_names():
                continue

            existing_columns = {col['name'] for col in inspector.get_columns(table_name)}

            for col_name in columns_to_check:
                if col_name not in existing_columns:
                    missing.append(f"{table_name}.{col_name}")

        return len(missing) == 0, missing

    except Exception as e:
        logger.error(f"[SCHEMA] Validation error: {str(e)}")
        return False, ["validation_error"]
