from typing import List
from pydantic import BaseModel, Field


class AIInvestigationOutput(BaseModel):
    incident_id: str = Field(..., description="Correlated incident identifier e.g. INC-001")
    summary: str = Field(..., description="High-level analyst summary of the incident")
    attack_progression: List[str] = Field(default_factory=list, description="Step-by-step kill-chain attack progression stages")
    key_evidence: List[str] = Field(default_factory=list, description="Observed telemetry facts supporting the analysis")
    affected_assets: List[str] = Field(default_factory=list, description="Target host IPs or services impacted")
    likely_attack_category: str = Field(..., description="Classification category (e.g. Multi-Stage Intrusion, Brute Force)")
    confidence: str = Field(..., description="Confidence level of inference: low, medium, high")
    reasoning: str = Field(..., description="Detailed analyst reasoning and hypothesis")
    recommended_actions: List[str] = Field(default_factory=list, description="Suggested containment, monitoring, or mitigation actions")
    limitations: List[str] = Field(default_factory=list, description="Explicit statement of missing telemetry or uncertainty bounds")
