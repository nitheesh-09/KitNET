from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.incident import Incident
from ..ai.engine import AIInvestigationEngine
from ..ai.schemas import AIInvestigationOutput

router = APIRouter(prefix="/incidents", tags=["AI Investigation"])


@router.post("/{incident_id}/investigate", response_model=AIInvestigationOutput, status_code=status.HTTP_200_OK)
def run_ai_investigation(incident_id: str, db: Session = Depends(get_db)):
    """
    Execute AI-powered investigation analysis for an incident using OpenAI API and local RAG guidelines.
    Returns structured analysis and persists results on the incident record.
    """
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident and incident_id.isdigit():
        incident = db.query(Incident).filter(Incident.id == int(incident_id)).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found",
        )

    engine = AIInvestigationEngine(db)
    analysis = engine.investigate(incident)
    return analysis
