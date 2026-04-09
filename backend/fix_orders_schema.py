"""
Emergency schema fix script for orders table.
Adds missing columns that exist in the model but not in the database.
"""

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import text, inspect

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from src.database import engine
from src.config import settings

def check_and_fix_schema():
    """Check orders table schema and add missing columns."""

    with engine.connect() as connection:
        inspector = inspect(engine)

        # Check if orders table exists
        tables = inspector.get_table_names()
        if 'orders' not in tables:
            print("[X] orders table does not exist")
            return False

        print("[OK] orders table exists")

        # Get existing columns
        columns = inspector.get_columns('orders')
        existing_columns = {col['name'] for col in columns}

        print(f"\nExisting columns: {sorted(existing_columns)}")

        # Required columns based on Order model
        required_columns = {
            'id', 'user_id', 'created_by_name', 'customer_name', 'customer_email',
            'customer_phone', 'customer_address', 'items', 'manual_items',
            'total_amount', 'advance_payment', 'balance', 'discount',
            'delivery_date', 'notes', 'status', 'created_at'
        }

        missing_columns = required_columns - existing_columns

        if not missing_columns:
            print("\n[OK] All required columns exist")
            return True

        print(f"\n[X] Missing columns: {sorted(missing_columns)}")

        # Add missing columns
        for col in sorted(missing_columns):
            try:
                if col == 'discount':
                    sql = text("ALTER TABLE orders ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0.00")
                elif col == 'balance':
                    sql = text("ALTER TABLE orders ADD COLUMN balance NUMERIC(10, 2)")
                elif col == 'advance_payment':
                    sql = text("ALTER TABLE orders ADD COLUMN advance_payment NUMERIC(10, 2) DEFAULT 0.00")
                elif col == 'manual_items':
                    sql = text("ALTER TABLE orders ADD COLUMN manual_items JSON DEFAULT '[]'")
                else:
                    print(f"  [SKIP] Skipping {col} (unknown type)")
                    continue

                connection.execute(sql)
                connection.commit()
                print(f"  [OK] Added column: {col}")
            except Exception as e:
                print(f"  [X] Failed to add {col}: {str(e)}")
                connection.rollback()

        print("\n[OK] Schema fix complete")
        return True

if __name__ == "__main__":
    print("="*60)
    print("Orders Table Schema Fix")
    print("="*60 + "\n")

    try:
        success = check_and_fix_schema()
        if success:
            print("\n[OK] Database schema is now aligned with model")
            sys.exit(0)
        else:
            print("\n[X] Schema fix incomplete")
            sys.exit(1)
    except Exception as e:
        print(f"\n[X] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
