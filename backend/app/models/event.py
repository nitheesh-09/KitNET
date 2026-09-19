from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from ..database import Base


class Event(Base):
    """SQLAlchemy model for the security events table."""
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(String(64), nullable=False, index=True)
    source_ip = Column(String(64), nullable=False, index=True)
    destination_ip = Column(String(64), nullable=False, index=True)
    username = Column(String(128), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    protocol = Column(String(32), nullable=False)
    service = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "source_ip": self.source_ip,
            "destination_ip": self.destination_ip,
            "username": self.username,
            "event_type": self.event_type,
            "protocol": self.protocol,
            "service": self.service,
            "status": self.status,
            "metadata": self.metadata_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
