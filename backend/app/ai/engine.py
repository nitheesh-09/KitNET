import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from openai import (
    OpenAI,
    AuthenticationError,
    APIConnectionError,
    APITimeoutError,
    RateLimitError,
)

from ..config import get_openai_api_key, get_openai_model
from ..models.incident import Incident
from ..models.event import Event
from ..models.detection import Detection
from ..knowledge.store import retrieve_knowledge
from .prompt import SYSTEM_PROMPT, build_investigation_prompt
from .schemas import AIInvestigationOutput


class AIInvestigationEngine:
    """
    AI Investigation and Explanation Engine using OpenAI API.
    Provides structured SOC analysis grounded in observed telemetry and local RAG guidelines.
    """

    def __init__(self, db: Session, client: Optional[OpenAI] = None):
        self.db = db
        self.api_key = get_openai_api_key()
        self.model = get_openai_model()
        self.client = client

    def get_client(self) -> OpenAI:
        if self.client:
            return self.client
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI API key is not configured. Set OPENAI_API_KEY in backend/.env or environment to enable automated AI investigations.",
            )
        return OpenAI(api_key=self.api_key)

    def investigate(self, incident: Incident) -> AIInvestigationOutput:
        """
        Run structured AI investigation for an incident.
        """
        client = self.get_client()

        # Load related events and detections
        event_ids = incident.event_ids or []
        detection_ids = incident.detection_ids or []

        events = (
            self.db.query(Event)
            .filter(Event.id.in_(event_ids))
            .order_by(Event.id.asc())
            .all()
            if event_ids
            else []
        )

        detections = (
            self.db.query(Detection)
            .filter(Detection.id.in_(detection_ids))
            .order_by(Detection.id.asc())
            .all()
            if detection_ids
            else []
        )

        # Retrieve relevant local RAG knowledge
        event_types = [e.event_type for e in events]
        detection_names = [d.detection_name for d in detections]
        knowledge_docs = retrieve_knowledge(
            attack_type=incident.attack_type,
            event_types=event_types,
            detection_names=detection_names,
        )

        user_prompt = build_investigation_prompt(
            incident=incident.to_dict(),
            events=[e.to_dict() for e in events],
            detections=[d.to_dict() for d in detections],
            knowledge_docs=knowledge_docs,
        )

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            raw_content = response.choices[0].message.content or "{}"
            parsed_dict = json.loads(raw_content)

            # Ensure incident_id is set
            parsed_dict["incident_id"] = incident.incident_id
            analysis = AIInvestigationOutput.model_validate(parsed_dict)
        except HTTPException:
            raise
        except AuthenticationError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OpenAI API key is invalid or unauthorized. Verify OPENAI_API_KEY in backend/.env.",
            )
        except (APIConnectionError, APITimeoutError):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI API is temporarily unavailable (network or timeout). Local RAG knowledge retrieval remains available.",
            )
        except RateLimitError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI API rate limit exceeded. Retry the investigation later.",
            )
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI Investigation generation failed: malformed model output.",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI Investigation generation failed: {str(e)}",
            )

        # Store results on the Incident model
        incident.ai_summary = analysis.summary
        incident.ai_analysis = analysis.model_dump()
        incident.ai_generated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(incident)

        return analysis
