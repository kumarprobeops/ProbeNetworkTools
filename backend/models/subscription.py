from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class SubscriptionTier(Base):
    __tablename__ = "subscription_tiers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    price_monthly = Column(Integer)
    price_yearly = Column(Integer)
    features = Column(JSON)
    rate_limit_minute = Column(Integer)
    rate_limit_hour = Column(Integer)
    rate_limit_day = Column(Integer)
    rate_limit_month = Column(Integer)
    max_scheduled_probes = Column(Integer)
    max_api_keys = Column(Integer)
    max_history_days = Column(Integer)
    allowed_probe_intervals = Column(String, default="15,60,1440")
    max_concurrent_requests = Column(Integer, default=5)
    request_priority = Column(Integer, default=1)
    priority = Column(Integer, default=1)
    allow_scheduled_probes = Column(Boolean, default=False)
    allow_api_access = Column(Boolean, default=False)
    allow_export = Column(Boolean, default=False)
    allow_alerts = Column(Boolean, default=False)
    allow_custom_intervals = Column(Boolean, default=False)
    priority_support = Column(Boolean, default=False)
    user_subscriptions = relationship("UserSubscription", back_populates="tier")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    tier_id = Column(Integer, ForeignKey("subscription_tiers.id"))
    is_active = Column(Boolean, default=True)
    starts_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    payment_id = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)
    user = relationship("User", back_populates="user_subscription")
    tier = relationship("SubscriptionTier", back_populates="user_subscriptions")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
