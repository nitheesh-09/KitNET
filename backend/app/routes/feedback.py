from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.incident import Incident
from ..models.feedback import AnalystFeedback
from ..feedback.schemas import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/incidents", tags=["Analyst Feedback"])


@router.post("/{incident_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(incident_id: str, feedback_in: FeedbackCreate, db: Session = Depends(get_db)):
    """
    Record analyst feedback (confirmed_threat, false_positive, needs_review) for an incident.
    Stores knowledge for continuous improvement without altering deterministic rules.
    """
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident and incident_id.isdigit():
        incident = db.query(Incident).filter(Incident.id == int(incident_id)).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found",
        )

    feedback_record = AnalystFeedback(
        incident_id=incident.incident_id,
        analyst_label=feedback_in.analyst_label.value,
        feedback=feedback_in.feedback,
        created_at=datetime.now(timezone.utc),
    )
    db.add(feedback_record)
    db.commit()
    db.refresh(feedback_record)

    return feedback_record


@router.get("/{incident_id}/feedback", response_model=List[FeedbackResponse], status_code=status.HTTP_200_OK)
def get_incident_feedback(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieve analyst feedback history for an incident.
    """
    return (
        db.query(AnalystFeedback)
        .filter(AnalystFeedback.incident_id == incident_id)
        .order_by(AnalystFeedback.id.desc())
        .all()
    )
