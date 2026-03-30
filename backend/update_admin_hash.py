"""
Update admin user password hash from bcrypt to SHA-256
"""
import os
import sys
from dotenv import load_dotenv
import hashlib

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in .env")
    sys.exit(1)

print("Updating admin password hash to SHA-256...")

from sqlalchemy import create_engine, text

def hash_password_sha256(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Update admin user password hash
    admin_email = "knadmin@knkitchen.com"
    admin_password = "admin123"
    new_hash = hash_password_sha256(admin_password)

    result = conn.execute(text("""
        UPDATE users
        SET password_hash = :new_hash
        WHERE email = :email
    """), {"new_hash": new_hash, "email": admin_email})

    conn.commit()

    print(f"Admin password hash updated successfully!")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    print(f"New SHA-256 hash: {new_hash}")

    # Verify
    user = conn.execute(text("""
        SELECT email, password_hash FROM users WHERE email = :email
    """), {"email": admin_email}).fetchone()

    if user:
        print(f"\nVerification: Hash in database matches: {user[1] == new_hash}")
