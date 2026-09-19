from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from ..database import Base


class ResponseAction(Base):
    """SQLAlchemy model for simulated response actions table."""
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    response_id = Column(String(32), unique=True, index=True, nullable=False)
    incident_id = Column(String(32), nullable=False, index=True)
    action = Column(String(128), nullable=False)
    reason = Column(Text, nullable=False)
    simulation_mode = Column(Boolean, nullable=False, default=True)
    status = Column(String(32), nullable=False, default="simulated")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), server_default=func.now())
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "response_id": self.response_id,
            "incident_id": self.incident_id,
            "action": self.action,
            "reason": self.reason,
            "simulation_mode": self.simulation_mode,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "executed_at": self.executed_at.isoformat() if self.executed_at else None,
        }
