from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.incident import Incident
from ..response.engine import ResponseEngine
from ..response.schemas import ResponseActionResponse, SimulatedResponseResult

router = APIRouter(tags=["Response Engine"])


@router.post("/incidents/{incident_id}/response", response_model=SimulatedResponseResult, status_code=status.HTTP_200_OK)
def trigger_simulated_response(incident_id: str, db: Session = Depends(get_db)):
    """
    Execute policy-driven safe simulated response actions for an incident.
    Always operates in virtual dry-run mode (simulation_mode=True).
    """
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident and incident_id.isdigit():
        incident = db.query(Incident).filter(Incident.id == int(incident_id)).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found",
        )

    engine = ResponseEngine(db)
    actions = engine.execute_simulated_response(incident)

    return SimulatedResponseResult(
        incident_id=incident.incident_id,
        simulation_mode=True,
        actions=actions,
        status="simulated",
    )


@router.get("/incidents/{incident_id}/response", response_model=List[ResponseActionResponse], status_code=status.HTTP_200_OK)
def get_incident_response_actions(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieve past simulated response actions recorded for an incident.
    """
    engine = ResponseEngine(db)
    return engine.get_incident_responses(incident_id)


@router.get("/responses", response_model=List[ResponseActionResponse], status_code=status.HTTP_200_OK)
def list_all_responses(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Retrieve all simulated response actions across all incidents for the SOC response audit dashboard.
    """
    engine = ResponseEngine(db)
    return engine.get_all_responses(limit=limit)
