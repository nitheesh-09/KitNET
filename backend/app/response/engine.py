from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from ..models.incident import Incident
from ..models.response import ResponseAction
from .rules import determine_policy_actions


class ResponseEngine:
    """
    Safe Simulated Incident Response Engine.
    Executes non-destructive dry-run containment actions without modifying live infrastructure.
    """

    def __init__(self, db: Session):
        self.db = db

    def execute_simulated_response(self, incident: Incident) -> List[ResponseAction]:
        """
        Evaluate policy and record simulated response actions.
        Deduplicates so repeated runs for the same incident do not create unlimited duplicates.
        """
        # Check if simulated responses already exist for this incident
        existing_actions = (
            self.db.query(ResponseAction)
            .filter(ResponseAction.incident_id == incident.incident_id)
            .all()
        )
        if existing_actions:
            return existing_actions

        policy_actions = determine_policy_actions(incident)

        current_max_id = self.db.query(func.max(ResponseAction.id)).scalar() or 0
        counter = current_max_id

        created_actions: List[ResponseAction] = []
        now = datetime.now(timezone.utc)

        for item in policy_actions:
            counter += 1
            act_id_str = f"ACT-{counter:03d}"

            action_record = ResponseAction(
                response_id=act_id_str,
                incident_id=incident.incident_id,
                action=item["action"],
                reason=item["reason"],
                simulation_mode=True,
                status="simulated",
                created_at=now,
                executed_at=now,
            )
            self.db.add(action_record)
            created_actions.append(action_record)

        if created_actions:
            self.db.commit()
            for a in created_actions:
                self.db.refresh(a)

        return created_actions

    def get_incident_responses(self, incident_id: str) -> List[ResponseAction]:
        return (
            self.db.query(ResponseAction)
            .filter(ResponseAction.incident_id == incident_id)
            .order_by(ResponseAction.id.asc())
            .all()
        )

    def get_all_responses(self, limit: int = 100) -> List[ResponseAction]:
        return (
            self.db.query(ResponseAction)
            .order_by(ResponseAction.id.desc())
            .limit(limit)
            .all()
        )
