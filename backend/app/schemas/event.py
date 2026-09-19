from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class EventType(str, Enum):
    LOGIN_FAILED = "login_failed"
    LOGIN_SUCCESS = "login_success"
    PORT_SCAN = "port_scan"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATABASE_ACCESS = "database_access"
    FILE_ACCESS = "file_access"
    LARGE_DATA_TRANSFER = "large_data_transfer"
    SUSPICIOUS_HTTP_REQUEST = "suspicious_http_request"
    UNUSUAL_CONNECTION = "unusual_connection"


class EventBase(BaseModel):
    timestamp: str = Field(..., description="Timestamp in ISO 8601 format e.g. 2026-09-19T10:32:01")
    source_ip: str = Field(..., description="Source IPv4/IPv6 address e.g. 10.0.0.200")
    destination_ip: str = Field(..., description="Destination IPv4/IPv6 address e.g. 10.0.0.30")
    username: Optional[str] = Field(None, description="Username associated with event, or null if unauthenticated")
    event_type: EventType = Field(..., description="Categorized security event type")
    protocol: str = Field(..., description="Network protocol e.g. TCP, UDP, HTTP, ICMP")
    service: str = Field(..., description="Target service e.g. AUTH, MYSQL, NGINX, SSH")
    status: str = Field(..., description="Event execution status e.g. failed, success, blocked, alert")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Optional arbitrary key-value JSON telemetry metadata")


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
