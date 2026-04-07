#!/usr/bin/env python3
"""Check if customer_address is being saved to database"""
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sqlalchemy import create_engine, text

DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kn_kitchen'

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Check recent orders
        result = conn.execute(text("""
            SELECT id, customer_name, customer_address, customer_email
            FROM orders
            ORDER BY id DESC
            LIMIT 5
        """))

        print("Recent orders:")
        print("-" * 80)
        for row in result:
            print(f"ID: {row[0]}, Name: {row[1]}, Address: {row[2]}, Email: {row[3]}")

        print("\n" + "-" * 80)
        print("Checking if customer_address column exists and its type:")

        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'orders' AND column_name = 'customer_address'
        """))

        row = result.fetchone()
        if row:
            print(f"Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}")
        else:
            print("customer_address column NOT FOUND!")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
