from sqlalchemy.orm import Session
from models.user import User
from core.database import SessionLocal
from passlib.hash import bcrypt

def reset_admin():
    db: Session = SessionLocal()
    # Delete any existing 'admin' user
    db.query(User).filter(User.username == "admin").delete()
    db.commit()  # <--- Commit the delete!
    # Add new admin user
    password = "admin123"
    hashed_password = bcrypt.hash(password)
    user = User(
        username="admin",
        hashed_password=hashed_password,
        role="admin",
        is_active=True,
        is_admin=True,
        email="admin@localhost",
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.close()
    print("Admin user reset complete!")

if __name__ == "__main__":
    reset_admin()