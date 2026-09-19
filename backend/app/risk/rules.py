from typing import List, Dict, Any, Tuple
from ..models.incident import Incident
from ..models.detection import Detection
from ..models.event import Event


def map_score_to_severity(score: int) -> str:
    """
    Map a 0-100 risk score to prototype risk severity levels:
    0–29   -> low
    30–59  -> medium
    60–79  -> high
    80–100 -> critical
    """
    if score >= 80:
        return "critical"
    elif score >= 60:
        return "high"
    elif score >= 30:
        return "medium"
    return "low"


def calculate_detection_points(detections: List[Detection], max_points: int = 60) -> int:
    """
    Calculate points from associated detections:
    low: +10, medium: +20, high: +30, critical: +40.
    Capped at max_points to avoid unlimited accumulation.
    """
    points = 0
    severity_weights = {
        "low": 10,
        "medium": 20,
        "high": 30,
        "critical": 40,
    }
    for d in detections:
        points += severity_weights.get(d.severity.lower(), 10)

    return min(points, max_points)


def calculate_stage_points(events: List[Event]) -> Tuple[int, int]:
    """
    Calculate attack stage points and count distinct progression stages:
    - Authentication activity: +10
    - Privilege escalation: +20
    - Database access: +15
    - Large data transfer: +20
    - Network reconnaissance: +10
    Returns (stage_points, distinct_stages_count).
    """
    types = set(e.event_type for e in events)

    stage_points = 0
    distinct_stages = 0

    if "login_failed" in types or "login_success" in types:
        stage_points += 10
        distinct_stages += 1

    if "privilege_escalation" in types:
        stage_points += 20
        distinct_stages += 1

    if "database_access" in types:
        stage_points += 15
        distinct_stages += 1

    if "large_data_transfer" in types:
        stage_points += 20
        distinct_stages += 1

    if "port_scan" in types or "suspicious_http_request" in types:
        stage_points += 10
        distinct_stages += 1

    return stage_points, distinct_stages


def calculate_multi_stage_points(distinct_stages: int) -> int:
    """
    Add points for multi-stage progression complexity:
    - 2 stages: +10
    - 3 stages: +20
    - 4+ stages: +30
    """
    if distinct_stages >= 4:
        return 30
    elif distinct_stages == 3:
        return 20
    elif distinct_stages == 2:
        return 10
    return 0


def calculate_repetition_points(events: List[Event]) -> int:
    """
    Award +10 points if repeated suspicious activity is present
    (e.g. 5+ total events, multiple failed logins, or multiple events of same type).
    """
    if len(events) >= 5:
        return 10

    failed_logins = sum(1 for e in events if e.event_type == "login_failed")
    if failed_logins >= 2:
        return 10

    type_counts: Dict[str, int] = {}
    for e in events:
        type_counts[e.event_type] = type_counts.get(e.event_type, 0) + 1
        if type_counts[e.event_type] >= 3:
            return 10

    return 0


def evaluate_incident_risk(
    incident: Incident,
    detections: List[Detection],
    events: List[Event],
) -> Dict[str, Any]:
    """
    Calculate deterministic, explainable risk score and transparent breakdown.
    Normalizes score strictly to 0-100.
    """
    det_points = calculate_detection_points(detections, max_points=60)
    stage_points, distinct_stages = calculate_stage_points(events)
    multi_stage_points = calculate_multi_stage_points(distinct_stages)
    repetition_points = calculate_repetition_points(events)

    raw_score = det_points + stage_points + multi_stage_points + repetition_points
    final_score = max(0, min(100, raw_score))
    severity = map_score_to_severity(final_score)

    return {
        "detection_severity_points": det_points,
        "attack_stage_points": stage_points,
        "multi_stage_points": multi_stage_points,
        "repetition_points": repetition_points,
        "final_score": final_score,
        "severity": severity,
    }
