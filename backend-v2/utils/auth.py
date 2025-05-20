from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from schemas.user_schema import UserRead
from models.user import User as UserModel
from models.database import get_db
from auth.jwt_handler import decode_access_token
import os

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

'''def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> UserRead:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    
    from auth.jwt_handler import decode_access_token
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception
    username = payload["sub"]


    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserRead.from_orm(user)'''

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> UserRead:
    print("🔥🔥 This is the REAL get_current_user function!")
    print("🚨 Entered get_current_user")
    print("Token received:", token[:40], "..." if len(token) > 40 else "")  # Print first 40 chars

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    from auth.jwt_handler import decode_access_token
    payload = decode_access_token(token)
    print("Decoded payload:", payload)

    if not payload or "sub" not in payload:
        print("❌ Invalid or missing 'sub' in payload")
        raise credentials_exception

    username = payload["sub"]
    print("Username from token:", username)

    user = db.query(UserModel).filter(UserModel.username == username).first()
    print("User from DB:", user.username if user else "None")

    if user is None:
        print("❌ User not found in DB")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    return UserRead.from_orm(user)

