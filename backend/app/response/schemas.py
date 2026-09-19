from typing import List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ResponseActionBase(BaseModel):
    action: str = Field(..., description="Simulated mitigation action title")
    reason: str = Field(..., description="Operational reason for containment action")
    simulation_mode: bool = Field(True, description="Always true - non-destructive dry run")
    status: str = Field("simulated", description="Action execution status e.g. recommended, simulated")


class ResponseActionCreate(ResponseActionBase):
    incident_id: str
    response_id: Optional[str] = None


class ResponseActionResponse(ResponseActionBase):
    id: int
    response_id: str
    incident_id: str
    created_at: Optional[Union[datetime, str]] = None
    executed_at: Optional[Union[datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)


class SimulatedResponseResult(BaseModel):
    incident_id: str
    simulation_mode: bool = True
    actions: List[ResponseActionResponse] = Field(default_factory=list)
    status: str = "simulated"
