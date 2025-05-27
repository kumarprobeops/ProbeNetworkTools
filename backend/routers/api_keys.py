from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models.api_key import ApiKey, generate_api_key
from core.dependencies import get_current_user
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/keys", tags=["API Keys"])

class ApiKeyCreate(BaseModel):
    name: str
    expires_days: int = 30

@router.post("/")
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Check if a token with the same name exists for this user
    existing = db.query(ApiKey).filter_by(user_id=current_user.id, name=payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="API key with this name already exists.")
    
    key = generate_api_key()
    expires_at = None
    if payload.expires_days and payload.expires_days > 0:
        expires_at = datetime.utcnow() + timedelta(days=payload.expires_days)
    api_key = ApiKey(
        key=key,
        name=payload.name,
        user_id=current_user.id,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return {
        "id": api_key.id,
        "key": api_key.key,
        "name": api_key.name,
        "created_at": api_key.created_at,
        "expires_at": api_key.expires_at,
        "is_active": api_key.is_active,
    }

@router.get("/")
def list_api_keys(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    keys = db.query(ApiKey).filter_by(user_id=current_user.id).all()
    return [
        {
            "id": key.id,
            "key": key.key,
            "name": key.name,
            "created_at": key.created_at,
            "expires_at": key.expires_at,
            "is_active": key.is_active,
        }
        for key in keys
    ]

@router.delete("/{key_id}")
def delete_api_key(key_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    api_key = db.query(ApiKey).filter_by(id=key_id, user_id=current_user.id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    db.delete(api_key)
    db.commit()
    return {"status": "deleted"}

@router.put("/{key_id}/deactivate")
def deactivate_api_key(key_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    api_key = db.query(ApiKey).filter_by(id=key_id, user_id=current_user.id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.is_active = False
    db.commit()
    db.refresh(api_key)
    return {
        "id": api_key.id,
        "is_active": api_key.is_active,
        "name": api_key.name,
        "key": api_key.key,
        "created_at": api_key.created_at,
        "expires_at": api_key.expires_at,
    }

@router.put("/{key_id}/activate")
def activate_api_key(key_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    api_key = db.query(ApiKey).filter_by(id=key_id, user_id=current_user.id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    api_key.is_active = True
    db.commit()
    db.refresh(api_key)
    return {
        "id": api_key.id,
        "is_active": api_key.is_active,
        "name": api_key.name,
        "key": api_key.key,
        "created_at": api_key.created_at,
        "expires_at": api_key.expires_at,
    }
