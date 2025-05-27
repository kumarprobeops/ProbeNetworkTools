from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class ProbeResult(Base):
    __tablename__ = "probe_results"

    id = Column(Integer, primary_key=True, index=True)
    scheduled_probe_id = Column(Integer, ForeignKey("scheduled_probes.id", ondelete="CASCADE"))
    result = Column(Text)
    status = Column(String)
    execution_time = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    scheduled_probe = relationship("ScheduledProbe", back_populates="probe_results")
