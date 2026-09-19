from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..config import get_openai_api_key, get_openai_model
from ..database import get_db
from ..models.event import Event
from ..models.detection import Detection
from ..models.incident import Incident
from ..models.response import ResponseAction

router = APIRouter(prefix="/system", tags=["System Status"])


@router.get("/status", status_code=status.HTTP_200_OK)
def get_system_pipeline_status(db: Session = Depends(get_db)):
    """
    Return comprehensive component health and pipeline availability across all platform subsystems.
    """
    # Test SQLite connection
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    openai_key_present = get_openai_api_key() is not None
    ai_status = "configured" if openai_key_present else "unavailable"
    ai_model = get_openai_model()

    events_count = db.query(Event).count() if db_connected else 0
    detections_count = db.query(Detection).count() if db_connected else 0
    incidents_count = db.query(Incident).count() if db_connected else 0
    responses_count = db.query(ResponseAction).count() if db_connected else 0

    return {
        "status": "healthy" if db_connected else "degraded",
        "components": {
            "fastapi": {
                "status": "online",
                "version": "1.0.0",
                "host": "127.0.0.1:8000",
            },
            "database": {
                "status": "connected" if db_connected else "error",
                "engine": "sqlite3",
                "events_stored": events_count,
            },
            "detection_engine": {
                "status": "active",
                "rules_active": 8,
                "detections_count": detections_count,
            },
            "correlation_engine": {
                "status": "active",
                "window_minutes": 30,
                "incidents_count": incidents_count,
            },
            "risk_scoring_engine": {
                "status": "active",
                "scale": "0-100",
                "algorithm": "deterministic_explainable",
            },
            "ai_investigation": {
                "status": ai_status,
                "model": ai_model,
                "configured": openai_key_present,
                "provider": "OpenAI",
                "rag_knowledge_docs": 8,
            },
            "response_engine": {
                "status": "active",
                "simulation_mode": True,
                "actions_recorded": responses_count,
            },
            "telemetry_adapter": {
                "status": "ready",
                "adapter": "JsonTelemetryAdapter",
                "docker_integration": "pending_partner_phase",
            },
        },
    }
