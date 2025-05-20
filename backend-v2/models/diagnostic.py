from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Diagnostic(Base):
    __tablename__ = "diagnostics"

    id = Column(Integer, primary_key=True, index=True)
    tool = Column(String)
    target = Column(String)
    result = Column(Text)
    status = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    execution_time = Column(Integer)

    user = relationship("User", back_populates="diagnostics")