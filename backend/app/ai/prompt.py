from typing import List, Dict, Any


SYSTEM_PROMPT = """You are a Principal Security Operations Center (SOC) Investigation AI Analyst.
Your role is to explain, interpret, and contextualize correlated security incidents based strictly on observed telemetry.

CRITICAL RULES:
1. STRICT ADHERENCE TO EVIDENCE: You must NEVER invent events, IP addresses, usernames, assets, timestamps, or attack stages.
2. SEPARATE EVIDENCE FROM INFERENCE: Clearly delineate what was directly observed in the telemetry logs versus what is your analytical deduction.
3. UNCERTAINTY & LIMITATIONS: State uncertainty where telemetry is ambiguous. For example, never label large data transfer as 'confirmed exfiltration' without proof of data egress content; use 'Possible data exfiltration'.
4. STRUCTURED JSON OUTPUT: You must respond ONLY with a valid JSON object matching the required schema. Do not include markdown codeblocks or conversational filler.
"""


def build_investigation_prompt(
    incident: Dict[str, Any],
    events: List[Dict[str, Any]],
    detections: List[Dict[str, Any]],
    knowledge_docs: List[str],
) -> str:
    """Construct prompt with explicit evidence and retrieved knowledge."""
    knowledge_section = "\n\n".join(knowledge_docs) if knowledge_docs else "No specific guidelines retrieved."

    timeline_str = ""
    for idx, item in enumerate(incident.get("timeline", []), 1):
        timeline_str += f"  {idx}. [{item.get('timestamp')}] {item.get('event_type')} (Event #{item.get('event_id')}): {item.get('description')}\n"

    detections_str = ""
    for d in detections:
        detections_str += f"  - [{d.get('detection_id')}] {d.get('rule_id')} | {d.get('detection_name')} ({d.get('severity')}) on Event #{d.get('event_id')}\n"

    prompt = f"""=== INVESTIGATION REFERENCE KNOWLEDGE (RAG CONTEXT) ===
{knowledge_section}

=== OBSERVED TELEMETRY EVIDENCE (FACTS - DO NOT ALTER OR INVENT) ===
- Incident ID: {incident.get('incident_id')}
- Source IP: {incident.get('source_ip')}
- Primary Destination IP: {incident.get('primary_destination_ip')}
- Affected Assets: {', '.join(incident.get('affected_assets', []))}
- Attack Type (Deterministic Pipeline): {incident.get('attack_type')}
- Risk Score: {incident.get('risk_score', 'N/A')} / 100 ({incident.get('severity', 'N/A')})
- Risk Breakdown: {incident.get('risk_breakdown', {})}
- Total Events: {incident.get('event_count', 0)}
- Total Detections: {incident.get('detection_count', 0)}

Chronological Observed Timeline:
{timeline_str if timeline_str else '  No timeline recorded.'}

Associated Detections:
{detections_str if detections_str else '  No detections triggered.'}

=== INSTRUCTIONS ===
Analyze the observed incident facts above in light of the reference knowledge.
Generate a structured JSON investigation report strictly with these exact keys:
{{
  "incident_id": "{incident.get('incident_id')}",
  "summary": "Concise executive investigation summary",
  "attack_progression": ["Phase 1: ...", "Phase 2: ..."],
  "key_evidence": ["Evidence point 1 ...", "Evidence point 2 ..."],
  "affected_assets": {incident.get('affected_assets', [])},
  "likely_attack_category": "Category title matching evidence",
  "confidence": "low|medium|high",
  "reasoning": "Detailed technical analysis explaining the progression and intent hypothesis",
  "recommended_actions": ["Simulated or recommended containment action 1", "..."],
  "limitations": ["Telemetry gaps or uncertainty bounds"]
}}
"""
    return prompt
