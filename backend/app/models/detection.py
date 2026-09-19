from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from ..database import Base


class Detection(Base):
    """SQLAlchemy model for the security detections table."""
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    detection_id = Column(String(32), unique=True, index=True, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    timestamp = Column(String(64), nullable=False, index=True)
    rule_id = Column(String(64), nullable=False, index=True)
    detection_name = Column(String(128), nullable=False)
    severity = Column(String(32), nullable=False, index=True)
    source_ip = Column(String(64), nullable=False, index=True)
    destination_ip = Column(String(64), nullable=False, index=True)
    username = Column(String(128), nullable=True, index=True)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, nullable=True)
    status = Column(String(32), nullable=False, default="new")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("event_id", "rule_id", name="uq_detection_event_rule"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "detection_id": self.detection_id,
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "rule_id": self.rule_id,
            "detection_name": self.detection_name,
            "severity": self.severity,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "username": self.username,
            "description": self.description,
            "evidence": self.evidence,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
