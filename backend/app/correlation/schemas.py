from typing import Optional, List, Union, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from ..schemas.event import EventResponse
from ..detection.schemas import DetectionResponse


class TimelineItem(BaseModel):
    timestamp: str = Field(..., description="Timestamp of the event in ISO 8601")
    event_id: int = Field(..., description="ID of the security event")
    event_type: str = Field(..., description="Type of the security event")
    description: str = Field(..., description="Human-readable description of this timeline step")


class IncidentBase(BaseModel):
    incident_id: str = Field(..., description="Unique incident identifier e.g. INC-001")
    source_ip: str = Field(..., description="Source IP address of attacker/origin")
    primary_destination_ip: str = Field(..., description="Primary initial target IP address")
    attack_type: str = Field(..., description="Derived descriptive attack classification")
    status: str = Field("open", description="Incident status (e.g. open, investigating, closed)")
    event_count: int = Field(..., description="Total correlated security events count")
    detection_count: int = Field(..., description="Total correlated security detections count")
    timeline: List[TimelineItem] = Field(default_factory=list, description="Ordered chronological attack timeline")
    affected_assets: List[str] = Field(default_factory=list, description="List of unique affected asset IP addresses")
    summary: str = Field(..., description="Evidence-based incident summary")
    risk_score: Optional[int] = Field(None, ge=0, le=100, description="Normalized 0-100 risk score")
    severity: Optional[str] = Field(None, description="Risk severity tier: low, medium, high, critical")
    risk_breakdown: Optional[Dict[str, Any]] = Field(None, description="Transparent risk score calculation breakdown")
    ai_summary: Optional[str] = Field(None, description="AI-generated investigation summary")
    ai_analysis: Optional[Dict[str, Any]] = Field(None, description="Structured AI investigation analysis")
    ai_generated_at: Optional[Union[datetime, str]] = Field(None, description="Timestamp of AI analysis generation")


class IncidentResponse(IncidentBase):
    id: int
    created_at: Optional[Union[datetime, str]] = None
    updated_at: Optional[Union[datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)


class IncidentDetailResponse(IncidentResponse):
    related_events: List[EventResponse] = Field(default_factory=list, description="Full details of correlated security events")
    related_detections: List[DetectionResponse] = Field(default_factory=list, description="Full details of correlated security detections")


class IncidentStatsResponse(BaseModel):
    total: int = 0
    open: int = 0
    closed: int = 0
    severity: Dict[str, int] = Field(
        default_factory=lambda: {"low": 0, "medium": 0, "high": 0, "critical": 0},
        description="Incident count breakdown by severity tier",
    )


class CorrelationRunResponse(BaseModel):
    status: str
    incidents_created: int
    incidents_updated: int
    incidents: List[IncidentResponse]
