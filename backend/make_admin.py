"""
Quick script to upgrade a user to ADMIN role
"""
from src.database import engine
from sqlmodel import Session, select
from src.models import User

def make_admin(email: str):
    with Session(engine) as session:
        statement = select(User).where(User.email == email)
        user = session.exec(statement).first()

        if user:
            user.role = "ADMIN"
            session.add(user)
            session.commit()
            print(f"✅ User {email} upgraded to ADMIN role!")
        else:
            print(f"❌ User {email} not found!")

if __name__ == "__main__":
    make_admin("knadmin@test.com")
