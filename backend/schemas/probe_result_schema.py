from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProbeResultRead(BaseModel):
    id: int
    result: Optional[str]
    status: Optional[str]
    execution_time: Optional[int]
    created_at: datetime

    class Config:
        orm_mode = True
