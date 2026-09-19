from enum import Enum
from typing import Optional, Union
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class FeedbackLabel(str, Enum):
    CONFIRMED_THREAT = "confirmed_threat"
    FALSE_POSITIVE = "false_positive"
    NEEDS_REVIEW = "needs_review"


class FeedbackCreate(BaseModel):
    analyst_label: Optional[FeedbackLabel] = Field(None, description="Analyst verdict label")
    label: Optional[FeedbackLabel] = Field(None, description="Alternative alias for verdict label")
    feedback: Optional[str] = Field(None, description="Optional detailed analyst comments or notes")
    analyst_notes: Optional[str] = Field(None, description="Alternative alias for comments or notes")


class FeedbackResponse(BaseModel):
    id: int
    incident_id: str
    analyst_label: FeedbackLabel
    feedback: Optional[str] = None
    created_at: Optional[Union[datetime, str]] = None

    model_config = ConfigDict(from_attributes=True)
