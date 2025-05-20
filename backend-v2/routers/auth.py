from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.database import get_db
from models.user import User
from schemas.user_schema import UserLogin, UserRead
from utils.hashing import verify_password
from auth.jwt_handler import create_access_token, decode_access_token
from auth.oauth2_scheme import oauth2_scheme

router = APIRouter()

@router.post("/login")
def login(form_data: UserLogin, db: Session = Depends(get_db)):
    print("🚨 LOGIN ATTEMPT")
    print("Username from request:", form_data.username)
    print("Password from request:", form_data.password)

    user = db.query(User).filter(User.username == form_data.username).first()

    print("User from DB:", user.username if user else "None")

    if user:
        print("Stored hash:", user.hashed_password)
        from passlib.hash import bcrypt
        try:
            print("Password match:", bcrypt.verify(form_data.password, user.hashed_password))
        except Exception as e:
            print("❌ Bcrypt error:", e)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/users/me", response_model=UserRead)
def read_users_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = db.query(User).filter(User.username == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
