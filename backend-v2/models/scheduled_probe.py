from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class ScheduledProbe(Base):
    __tablename__ = "scheduled_probes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    description = Column(String, nullable=True)
    tool = Column(String)
    target = Column(String)
    interval_minutes = Column(Integer)
    is_active = Column(Boolean, default=True)
    alert_on_failure = Column(Boolean, default=False)
    alert_on_threshold = Column(Boolean, default=False)
    threshold_value = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship("User", back_populates="scheduled_probes")
    probe_results = relationship("ProbeResult", back_populates="scheduled_probe", cascade="all, delete-orphan")