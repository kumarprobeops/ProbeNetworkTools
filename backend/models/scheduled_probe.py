from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class ScheduledProbe(Base):
    __tablename__ = "scheduled_probes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    tool = Column(String)
    target = Column(String)
    interval_minutes = Column(Integer)
    is_active = Column(Boolean, default=True)
    alert_on_failure = Column(Boolean, default=False)
    alert_on_threshold = Column(Boolean, default=False)
    threshold_value = Column(Integer, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    user = relationship("User", back_populates="scheduled_probes")
    probe_results = relationship(
        "ProbeResult",
        back_populates="scheduled_probe",
        cascade="all, delete-orphan"
    )
