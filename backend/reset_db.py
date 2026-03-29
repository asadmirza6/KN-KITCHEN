"""
Script to reset the database and create a single admin user.
Deletes all existing users and creates one admin user with specified credentials.
"""
from sqlmodel import Session, select, delete
from src.database import engine
from src.models import User
from src.middleware.auth import hash_password


def reset_database():
    """Reset the database and create a single admin user."""

    print("Resetting database...")

    with Session(engine) as session:
        # Delete all existing users
        statement = delete(User)
        result = session.exec(statement)
        session.commit()

        print(f"Deleted {result.rowcount} existing users.")

        # Create new admin user
        admin_email = "asad@admin.com"
        admin_password = "admin123"
        admin_name = "Admin User"

        # Hash the password
        hashed_password = hash_password(admin_password)

        # Create admin user
        admin_user = User(
            name=admin_name,
            email=admin_email,
            password_hash=hashed_password,
            role="ADMIN"
        )

        session.add(admin_user)
        session.commit()
        session.refresh(admin_user)

        print(f"✅ Admin user created successfully!")
        print(f"   Email: {admin_email}")
        print(f"   Password: {admin_password}")
        print(f"   Name: {admin_name}")
        print(f"   Role: {admin_user.role}")
        print("\nThe database has been reset with only this admin user.")


if __name__ == "__main__":
    reset_database()