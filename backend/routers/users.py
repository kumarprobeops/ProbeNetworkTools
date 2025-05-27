from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from utils.hashing import hash_password
from core.dependencies import get_db, get_current_user, get_current_admin_user
from models.user import User
from schemas.user_schema import UserRead
from typing import List

router = APIRouter(prefix="/api/users", tags=["users"])

# List all users (Admin only)
@router.get("/", response_model=List[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    return db.query(User).all()

# Adding handler for /me 
@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# Get user by ID (Admin or self)
@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

# Create user (Admin only)
from schemas.user_schema import UserLogin  # You may want to create UserCreate schema for admin creation

@router.post("/", response_model=UserRead)
def create_user(
    user: UserLogin,  # Replace with UserCreate if you have one
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    db_user = db.query(User).filter((User.username == user.username) | (User.email == user.username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    hashed_pw = hash_password(user.password)
    new_user = User(
        username=user.username,
        email=user.username,  # Or use user.email if you separate username/email
        hashed_password=hashed_pw
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Update user (Admin or self)
@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_update: UserLogin,  # Or make a UserUpdate schema
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user_update.password:
        user.hashed_password = hash_password(user_update.password)
    db.commit()
    db.refresh(user)
    return user

# Delete user (Admin only)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return None


