from pydantic import BaseModel
from typing import Optional, List
from .probe_result_schema import ProbeResultRead

class ScheduledProbeBase(BaseModel):
    name: str
    description: Optional[str] = None
    tool: str
    target: str
    interval_minutes: int
    is_active: Optional[bool] = True
    alert_on_failure: Optional[bool] = False
    alert_on_threshold: Optional[bool] = False
    threshold_value: Optional[int] = None

class ScheduledProbeRead(ScheduledProbeBase):
    id: int
    probe_results: List[ProbeResultRead] = []  # <-- this is correct

    class Config:
        orm_mode = True

class ScheduledProbeCreate(ScheduledProbeBase):
    pass

class ScheduledProbeUpdate(ScheduledProbeBase):
    pass
