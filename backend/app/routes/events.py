from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..models.event import Event
from ..schemas.event import EventCreate, EventResponse, HealthResponse

router = APIRouter(tags=["Events"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint verifying FastAPI and SQLite database connectivity."""
    try:
        # Check SQLite connectivity
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "ok",
        "service": "cybernet-backend",
        "database": db_status,
    }


@router.post(
    "/events",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest a security event",
)
def create_event(event_in: EventCreate, db: Session = Depends(get_db)):
    """
    Ingest and validate an incoming security event.
    Stores event in SQLite and returns the persisted record with assigned ID.
    """
    db_event = Event(
        timestamp=event_in.timestamp,
        source_ip=event_in.source_ip,
        destination_ip=event_in.destination_ip,
        username=event_in.username,
        event_type=event_in.event_type.value,
        protocol=event_in.protocol,
        service=event_in.service,
        status=event_in.status,
        metadata_json=event_in.metadata,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event.to_dict()


@router.get(
    "/events",
    response_model=List[EventResponse],
    summary="List ingested events with pagination",
)
def list_events(
    limit: int = Query(100, ge=1, le=500, description="Max number of events to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """Retrieve stored events ordered by newest first with offset pagination."""
    events = (
        db.query(Event)
        .order_by(Event.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [e.to_dict() for e in events]


@router.get(
    "/events/{event_id}",
    response_model=EventResponse,
    summary="Retrieve a single event by ID",
)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a single event by ID. Returns 404 if not found."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found",
        )
    return event.to_dict()
