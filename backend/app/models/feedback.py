from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base


class AnalystFeedback(Base):
    """SQLAlchemy model for analyst feedback on incidents table."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(String(32), nullable=False, index=True)
    analyst_label = Column(String(32), nullable=False)
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "analyst_label": self.analyst_label,
            "feedback": self.feedback,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
