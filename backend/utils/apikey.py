from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from core.database import get_db
from models.api_key import ApiKey

def get_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    key_obj = db.query(ApiKey).filter_by(key=x_api_key, is_active=True).first()
    if not key_obj:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")
    return key_obj
