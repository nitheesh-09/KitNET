from typing import List, Tuple, Set
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from ..models.event import Event
from ..models.detection import Detection
from .rules import evaluate_rules, DetectionCandidate, parse_timestamp


class DetectionEngine:
    """
    Hybrid Rule-Based Detection Engine.
    Analyzes stored security events in SQLite and produces detections
    without creating duplicates for the same (event_id, rule_id) pair.
    """

    def __init__(self, db: Session):
        self.db = db

    def run(self) -> Tuple[int, List[Detection]]:
        """
        Execute detection rules against all stored events.
        Returns (events_analyzed_count, list_of_new_detections).
        """
        # Fetch all events sorted by timestamp and ID
        events: List[Event] = self.db.query(Event).order_by(Event.id.asc()).all()
        # Sort using robust timestamp parser to ensure chronological evaluation
        events.sort(key=lambda e: (parse_timestamp(e.timestamp), e.id))

        if not events:
            return 0, []

        # Query existing (event_id, rule_id) pairs to enforce deduplication
        existing_pairs: Set[Tuple[int, str]] = set(
            self.db.query(Detection.event_id, Detection.rule_id).all()
        )

        # Get highest detection integer ID to generate sequential readable detection_ids (DET-001, etc.)
        current_max_id = self.db.query(func.max(Detection.id)).scalar() or 0
        counter = current_max_id

        new_detections: List[Detection] = []

        for current_event in events:
            # Evaluate all 8 hybrid rules against this event with full historical event context
            candidates: List[DetectionCandidate] = evaluate_rules(
                current_event=current_event,
                all_events=events,
            )

            for cand in candidates:
                pair_key = (cand.event_id, cand.rule_id)
                if pair_key in existing_pairs:
                    # Deduplication: detection already exists for this event and rule
                    continue

                counter += 1
                det_id_str = f"DET-{counter:03d}"

                detection_record = Detection(
                    detection_id=det_id_str,
                    event_id=cand.event_id,
                    timestamp=cand.timestamp,
                    rule_id=cand.rule_id,
                    detection_name=cand.detection_name,
                    severity=cand.severity,
                    source_ip=cand.source_ip,
                    destination_ip=cand.destination_ip,
                    username=cand.username,
                    description=cand.description,
                    evidence=cand.evidence,
                    status=cand.status,
                )

                self.db.add(detection_record)
                existing_pairs.add(pair_key)
                new_detections.append(detection_record)

        if new_detections:
            self.db.commit()
            for d in new_detections:
                self.db.refresh(d)

        return len(events), new_detections
