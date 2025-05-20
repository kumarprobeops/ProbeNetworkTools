from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class ProbeResult(Base):
    __tablename__ = "probe_results"

    id = Column(Integer, primary_key=True, index=True)
    scheduled_probe_id = Column(Integer, ForeignKey("scheduled_probes.id"))
    result = Column(Text)
    status = Column(String)
    execution_time = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    scheduled_probe = relationship("ScheduledProbe", back_populates="probe_results")