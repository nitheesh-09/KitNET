from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.incident import Incident
from ..models.event import Event
from ..models.detection import Detection
from ..correlation.engine import CorrelationEngine
from ..correlation.schemas import (
    IncidentResponse,
    IncidentDetailResponse,
    IncidentStatsResponse,
    CorrelationRunResponse,
)
from ..risk.engine import RiskScoringEngine
from ..risk.schemas import RiskCalculationResponse

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.post("/correlate", response_model=CorrelationRunResponse, status_code=status.HTTP_200_OK)
def run_correlation(db: Session = Depends(get_db)):
    """
    Execute event correlation engine across all stored events and detections.
    Synthesizes attack sequences into incidents, scores risk, and avoids duplicates.
    """
    engine = CorrelationEngine(db)
    created, updated, incidents = engine.correlate()
    return CorrelationRunResponse(
        status="success",
        incidents_created=created,
        incidents_updated=updated,
        incidents=incidents,
    )


@router.get("/stats", response_model=IncidentStatsResponse, status_code=status.HTTP_200_OK)
def get_incident_stats(db: Session = Depends(get_db)):
    """
    Return summary statistics of correlated incidents (total, open, closed, severity counts).
    """
    all_incidents = db.query(Incident).all()
    total = len(all_incidents)
    open_count = sum(1 for i in all_incidents if i.status.lower() == "open")
    closed_count = sum(1 for i in all_incidents if i.status.lower() == "closed")

    severity_counts = {
        "low": sum(1 for i in all_incidents if (i.severity or "").lower() == "low"),
        "medium": sum(1 for i in all_incidents if (i.severity or "").lower() == "medium"),
        "high": sum(1 for i in all_incidents if (i.severity or "").lower() == "high"),
        "critical": sum(1 for i in all_incidents if (i.severity or "").lower() == "critical"),
    }

    return IncidentStatsResponse(
        total=total,
        open=open_count,
        closed=closed_count,
        severity=severity_counts,
    )


@router.get("", response_model=List[IncidentResponse], status_code=status.HTTP_200_OK)
def get_incidents(
    status: Optional[str] = Query(None, description="Filter by status e.g. open, closed"),
    attack_type: Optional[str] = Query(None, description="Filter by attack classification"),
    source_ip: Optional[str] = Query(None, description="Filter by attacker source IP"),
    limit: int = Query(50, ge=1, le=500, description="Max incidents to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """
    Retrieve list of correlated incidents with optional filters.
    """
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if attack_type:
        query = query.filter(Incident.attack_type == attack_type)
    if source_ip:
        query = query.filter(Incident.source_ip == source_ip)

    return query.order_by(Incident.id.desc()).offset(offset).limit(limit).all()


@router.post("/{incident_id}/risk", response_model=RiskCalculationResponse, status_code=status.HTTP_200_OK)
def calculate_incident_risk(incident_id: str, db: Session = Depends(get_db)):
    """
    Calculate or recalculate the deterministic risk score and breakdown for an incident.
    """
    engine = RiskScoringEngine(db)
    scored_incident = engine.score_incident_by_id(incident_id)
    if not scored_incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found",
        )
    return RiskCalculationResponse(
        incident_id=scored_incident.incident_id,
        risk_score=scored_incident.risk_score,
        severity=scored_incident.severity,
        risk_breakdown=scored_incident.risk_breakdown,
    )


@router.get("/{incident_id}", response_model=IncidentDetailResponse, status_code=status.HTTP_200_OK)
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)):
    """
    Retrieve one incident by ID with full timeline, affected assets, related events, related detections, and risk score.
    """
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident and incident_id.isdigit():
        incident = db.query(Incident).filter(Incident.id == int(incident_id)).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found",
        )

    # Fetch full event and detection records
    event_ids = incident.event_ids or []
    detection_ids = incident.detection_ids or []

    related_events = (
        db.query(Event)
        .filter(Event.id.in_(event_ids))
        .order_by(Event.id.asc())
        .all()
        if event_ids
        else []
    )

    related_detections = (
        db.query(Detection)
        .filter(Detection.id.in_(detection_ids))
        .order_by(Detection.id.asc())
        .all()
        if detection_ids
        else []
    )

    detail = incident.to_dict()
    detail["related_events"] = [e.to_dict() for e in related_events]
    detail["related_detections"] = [d.to_dict() for d in related_detections]

    return detail
