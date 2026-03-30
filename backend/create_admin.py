"""
Reset users table and create main admin user.
- Orders ka data safe rahega (delete nahi hoga)
- Purane users hata diye jayenge
- Naya ADMIN banaya jayega: knadmin@knkitchen.com / admin123
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env")
    sys.exit(1)

print("Connecting to database...")

from sqlalchemy import create_engine, text
from passlib.context import CryptContext
from datetime import datetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:

    # Step 1: Existing users count
    count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
    print(f"Found {count} existing user(s).")

    # Step 2: Create new admin FIRST (taake foreign key update ho sake)
    admin_name     = "KN Admin"
    admin_email    = "knadmin@knkitchen.com"
    admin_password = "admin123"
    password_hash  = pwd_context.hash(admin_password)
    created_at     = datetime.utcnow()

    # Agar ye email pehle se hai toh usse skip karo
    existing = conn.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": admin_email}
    ).scalar()

    if existing:
        print(f"Admin email already exists (id={existing}), updating role to ADMIN...")
        conn.execute(text("""
            UPDATE users
            SET name=:name, password_hash=:password_hash, role='ADMIN'
            WHERE email=:email
        """), {"name": admin_name, "password_hash": password_hash, "email": admin_email})
        new_admin_id = existing
    else:
        conn.execute(text("""
            INSERT INTO users (name, email, password_hash, role, created_at)
            VALUES (:name, :email, :password_hash, 'ADMIN', :created_at)
        """), {
            "name": admin_name,
            "email": admin_email,
            "password_hash": password_hash,
            "created_at": created_at
        })
        new_admin_id = conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": admin_email}
        ).scalar()

    print(f"New admin created/updated with id={new_admin_id}")

    # Step 3: Orders ko new admin se link karo (purane user_id replace)
    orders_updated = conn.execute(text("""
        UPDATE orders
        SET user_id = :new_id
        WHERE user_id != :new_id
    """), {"new_id": new_admin_id}).rowcount
    print(f"Orders updated to point to new admin: {orders_updated} order(s).")

    # Step 4: Ab purane users delete karo (new admin ke ilawa)
    deleted = conn.execute(text("""
        DELETE FROM users
        WHERE email != :email
    """), {"email": admin_email}).rowcount
    print(f"Old users deleted: {deleted}")

    conn.commit()

    # Step 5: Verify
    user = conn.execute(
        text("SELECT id, name, email, role, created_at FROM users WHERE email = :email"),
        {"email": admin_email}
    ).fetchone()

    orders_count = conn.execute(text("SELECT COUNT(*) FROM orders")).scalar()

    print("\n" + "="*50)
    print("✅ DATABASE RESET SUCCESSFUL!")
    print("="*50)
    print(f"  ID      : {user[0]}")
    print(f"  Name    : {user[1]}")
    print(f"  Email   : {user[2]}")
    print(f"  Role    : {user[3]}")
    print(f"  Created : {user[4]}")
    print("-"*50)
    print(f"  Login Email   : {admin_email}")
    print(f"  Login Password: {admin_password}")
    print("-"*50)
    print(f"  Orders in DB  : {orders_count} (safe, koi data delete nahi hua)")
    print("="*50)
