from enum import Enum
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DetectionBase(BaseModel):
    event_id: int = Field(..., description="ID of the triggering security event")
    timestamp: str = Field(..., description="Timestamp of the detection in ISO 8601")
    rule_id: str = Field(..., description="Identifier of the detection rule triggered")
    detection_name: str = Field(..., description="Human-readable name of the detection")
    severity: SeverityLevel = Field(..., description="Severity level of the detection")
    source_ip: str = Field(..., description="Source IP address")
    destination_ip: str = Field(..., description="Destination IP address")
    username: Optional[str] = Field(None, description="Username if applicable")
    description: str = Field(..., description="Detailed description of detection finding")
    evidence: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Structured telemetry evidence")
    status: str = Field("new", description="Detection triage status (e.g., new, investigating, resolved)")


class DetectionCreate(DetectionBase):
    detection_id: str = Field(..., description="Formatted detection ID e.g. DET-001")


class DetectionResponse(DetectionBase):
    id: int
    detection_id: str
    created_at: Optional[Union[datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)


class DetectionStatsResponse(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class DetectionRunResponse(BaseModel):
    status: str
    events_analyzed: int
    new_detections: int
    detections: List[DetectionResponse]
