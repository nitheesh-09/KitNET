from typing import Optional, List
from sqlalchemy.orm import Session
from ..models.incident import Incident
from ..models.detection import Detection
from ..models.event import Event
from .rules import evaluate_incident_risk


class RiskScoringEngine:
    """
    Deterministic & Explainable Incident Risk Scoring Engine.
    Computes a 0-100 risk score and transparent breakdown for security incidents.
    """

    def __init__(self, db: Session):
        self.db = db

    def score_incident(self, incident: Incident) -> Incident:
        """
        Calculate and persist risk score, severity, and breakdown for a given incident.
        """
        event_ids = incident.event_ids or []
        detection_ids = incident.detection_ids or []

        events: List[Event] = (
            self.db.query(Event)
            .filter(Event.id.in_(event_ids))
            .order_by(Event.id.asc())
            .all()
            if event_ids
            else []
        )

        detections: List[Detection] = (
            self.db.query(Detection)
            .filter(Detection.id.in_(detection_ids))
            .order_by(Detection.id.asc())
            .all()
            if detection_ids
            else []
        )

        breakdown = evaluate_incident_risk(incident, detections, events)

        incident.risk_score = breakdown["final_score"]
        incident.severity = breakdown["severity"]
        incident.risk_breakdown = breakdown

        self.db.commit()
        self.db.refresh(incident)

        return incident

    def score_incident_by_id(self, incident_id: str) -> Optional[Incident]:
        """
        Look up incident by incident_id (e.g. INC-001) or primary key and score it.
        """
        incident = self.db.query(Incident).filter(Incident.incident_id == incident_id).first()
        if not incident and incident_id.isdigit():
            incident = self.db.query(Incident).filter(Incident.id == int(incident_id)).first()

        if not incident:
            return None

        return self.score_incident(incident)
