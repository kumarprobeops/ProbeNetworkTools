from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class ProbeNode(Base):
    __tablename__ = "probe_nodes"

    id = Column(Integer, primary_key=True, index=True)
    node_uuid = Column(String, unique=True, index=True)
    name = Column(String)
    hostname = Column(String)
    internal_ip = Column(String, nullable=True)
    external_ip = Column(String, nullable=True)
    region = Column(String)
    zone = Column(String, nullable=True)
    api_key = Column(String, unique=True)
    is_active = Column(Boolean, default=True)
    status = Column(String, default="registered")
    last_heartbeat = Column(DateTime, nullable=True)
    version = Column(String, nullable=True)
    connection_type = Column(String, nullable=True)
    last_connected = Column(DateTime, nullable=True)
    connection_id = Column(String, nullable=True)
    reconnect_count = Column(Integer, default=0)
    max_concurrent_probes = Column(Integer, default=10)
    supported_tools = Column(JSON, default=lambda: {"ping": True, "traceroute": True, "dns": True, "http": True})
    hardware_info = Column(JSON, nullable=True)
    network_info = Column(JSON, nullable=True)
    priority = Column(Integer, default=1)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    current_load = Column(Float, default=0.0)
    avg_response_time = Column(Float, default=0.0)
    error_count = Column(Integer, default=0)
    total_probes_executed = Column(Integer, default=0)
    config = Column(JSON, default=dict)
    diagnostics = relationship("Diagnostic", secondary="node_diagnostics", backref="executed_by_nodes")

class NodeDiagnostic(Base):
    __tablename__ = "node_diagnostics"
    node_id = Column(Integer, ForeignKey("probe_nodes.id"), primary_key=True)
    diagnostic_id = Column(Integer, ForeignKey("diagnostics.id"), primary_key=True)
    executed_at = Column(DateTime, default=datetime.utcnow)
    execution_time = Column(Float)

class NodeRegistrationToken(Base):
    __tablename__ = "node_registration_tokens"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    node_id = Column(Integer, ForeignKey("probe_nodes.id"), nullable=True)
    intended_region = Column(String, nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_user_id])
    node = relationship("ProbeNode", foreign_keys=[node_id], backref="registration_token")