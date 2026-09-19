from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class RiskBreakdown(BaseModel):
    detection_severity_points: int = Field(..., description="Points from associated detection severities (capped at 60)")
    attack_stage_points: int = Field(..., description="Points derived from observed attack kill-chain stages")
    multi_stage_points: int = Field(..., description="Points awarded for multi-stage progression complexity")
    repetition_points: int = Field(..., description="Points awarded for repeated suspicious activity bursts")
    final_score: int = Field(..., ge=0, le=100, description="Normalized 0-100 risk score")
    severity: str = Field(..., description="Risk severity tier: low, medium, high, critical")


class RiskCalculationResponse(BaseModel):
    incident_id: str = Field(..., description="Identifier of the scored incident")
    risk_score: int = Field(..., ge=0, le=100, description="Calculated 0-100 risk score")
    severity: str = Field(..., description="Calculated risk severity: low, medium, high, critical")
    risk_breakdown: RiskBreakdown = Field(..., description="Transparent breakdown explaining score derivation")
