from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from ..database import Base


class Incident(Base):
    """SQLAlchemy model for the security incidents table."""
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(String(32), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), server_default=func.now())
    source_ip = Column(String(64), nullable=False, index=True)
    primary_destination_ip = Column(String(64), nullable=False, index=True)
    attack_type = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="open")
    event_count = Column(Integer, nullable=False, default=0)
    detection_count = Column(Integer, nullable=False, default=0)
    timeline = Column(JSON, nullable=False, default=list)
    affected_assets = Column(JSON, nullable=False, default=list)
    summary = Column(Text, nullable=False)
    event_ids = Column(JSON, nullable=False, default=list)
    detection_ids = Column(JSON, nullable=False, default=list)
    risk_score = Column(Integer, nullable=True, default=None)
    severity = Column(String(32), nullable=True, default=None)
    risk_breakdown = Column(JSON, nullable=True, default=None)
    ai_summary = Column(Text, nullable=True, default=None)
    ai_analysis = Column(JSON, nullable=True, default=None)
    ai_generated_at = Column(DateTime, nullable=True, default=None)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "source_ip": self.source_ip,
            "primary_destination_ip": self.primary_destination_ip,
            "attack_type": self.attack_type,
            "status": self.status,
            "event_count": self.event_count,
            "detection_count": self.detection_count,
            "timeline": self.timeline,
            "affected_assets": self.affected_assets,
            "summary": self.summary,
            "event_ids": self.event_ids,
            "detection_ids": self.detection_ids,
            "risk_score": self.risk_score,
            "severity": self.severity,
            "risk_breakdown": self.risk_breakdown,
            "ai_summary": self.ai_summary,
            "ai_analysis": self.ai_analysis,
            "ai_generated_at": self.ai_generated_at.isoformat() if self.ai_generated_at else None,
        }
