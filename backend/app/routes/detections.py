from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.detection import Detection
from ..detection.engine import DetectionEngine
from ..detection.schemas import (
    DetectionResponse,
    DetectionStatsResponse,
    DetectionRunResponse,
)

router = APIRouter(prefix="/detections", tags=["Detections"])


@router.post("/run", response_model=DetectionRunResponse, status_code=status.HTTP_200_OK)
def run_detection_engine(db: Session = Depends(get_db)):
    """
    Run the hybrid rule-based detection engine across all stored security events.
    Enforces deduplication on (event_id, rule_id).
    """
    engine = DetectionEngine(db)
    events_analyzed, new_detections = engine.run()
    return DetectionRunResponse(
        status="success",
        events_analyzed=events_analyzed,
        new_detections=len(new_detections),
        detections=new_detections,
    )


@router.get("/stats", response_model=DetectionStatsResponse, status_code=status.HTTP_200_OK)
def get_detection_stats(db: Session = Depends(get_db)):
    """
    Return simple counts of detections aggregated by severity level.
    """
    results = (
        db.query(Detection.severity, func.count(Detection.id))
        .group_by(Detection.severity)
        .all()
    )
    counts = {sev: count for sev, count in results}
    return DetectionStatsResponse(
        low=counts.get("low", 0),
        medium=counts.get("medium", 0),
        high=counts.get("high", 0),
        critical=counts.get("critical", 0),
    )


@router.get("", response_model=List[DetectionResponse], status_code=status.HTTP_200_OK)
def get_detections(
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high, critical)"),
    rule_id: Optional[str] = Query(None, description="Filter by detection rule ID (e.g. AUTH-001)"),
    status: Optional[str] = Query(None, description="Filter by detection status (e.g. new, resolved)"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of detections to return"),
    offset: int = Query(0, ge=0, description="Number of detections to skip"),
    db: Session = Depends(get_db),
):
    """
    Retrieve stored detections with optional filtering and pagination.
    """
    query = db.query(Detection)
    if severity:
        query = query.filter(Detection.severity == severity.lower())
    if rule_id:
        query = query.filter(Detection.rule_id == rule_id)
    if status:
        query = query.filter(Detection.status == status)

    detections = query.order_by(Detection.id.asc()).offset(offset).limit(limit).all()
    return detections


@router.get("/{detection_id}", response_model=DetectionResponse, status_code=status.HTTP_200_OK)
def get_detection(detection_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a single detection by its formatted detection_id (e.g. DET-001) or primary key id.
    """
    detection = db.query(Detection).filter(Detection.detection_id == detection_id).first()
    if not detection and detection_id.isdigit():
        detection = db.query(Detection).filter(Detection.id == int(detection_id)).first()

    if not detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Detection with ID '{detection_id}' not found",
        )

    return detection
