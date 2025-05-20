from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    role = Column(String, default="user")   # <-- Added role column
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    diagnostics = relationship("Diagnostic", back_populates="user", cascade="all, delete-orphan")
    user_subscription = relationship("UserSubscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    scheduled_probes = relationship("ScheduledProbe", back_populates="user", cascade="all, delete-orphan")
    api_usage_logs = relationship("ApiUsageLog", back_populates="user", cascade="all, delete-orphan")
