from typing import List, Tuple, Set
from ..models.event import Event
from ..models.detection import Detection


def get_event_description(event: Event) -> str:
    """Generate concise human-readable description for a timeline entry."""
    evt_type = event.event_type
    user = f" by user '{event.username}'" if event.username else ""
    srv = f" on {event.service}" if event.service else ""

    if evt_type == "login_failed":
        return f"Failed authentication attempt{user}{srv}"
    elif evt_type == "login_success":
        return f"Successful authentication{user}{srv}"
    elif evt_type == "privilege_escalation":
        return f"Privilege escalation detected{user}{srv}"
    elif evt_type == "database_access":
        return f"Database query execution recorded{user}{srv}"
    elif evt_type == "large_data_transfer":
        return f"Large outbound/lateral data transfer detected{srv}"
    elif evt_type == "port_scan":
        return f"Network port scanning activity observed{srv}"
    elif evt_type == "suspicious_http_request":
        return f"Suspicious HTTP web application request detected{srv}"
    elif evt_type == "unusual_connection":
        return f"Unusual connection pattern established{srv}"
    return f"Security telemetry event '{evt_type}' recorded{srv}"


def generate_timeline(events: List[Event]) -> List[dict]:
    """Build chronological ordered timeline items."""
    return [
        {
            "timestamp": e.timestamp,
            "event_id": e.id,
            "event_type": e.event_type,
            "description": get_event_description(e),
        }
        for e in events
    ]


def classify_attack_type(events: List[Event], detections: List[Detection]) -> Tuple[str, str]:
    """
    Derive descriptive, evidence-based attack type and concise incident summary
    based strictly on observed event progressions.
    """
    event_types = [e.event_type for e in events]
    type_set = set(event_types)

    failed_login_count = sum(1 for t in event_types if t == "login_failed")
    has_failed = failed_login_count > 0
    has_success = "login_success" in type_set
    has_priv = "privilege_escalation" in type_set
    has_db = "database_access" in type_set
    has_transfer = "large_data_transfer" in type_set
    has_scan = "port_scan" in type_set
    has_http = "suspicious_http_request" in type_set

    # Count distinct kill-chain progression stages
    stage_flags = [
        (has_failed or has_success),      # Authentication stage
        has_priv,                          # Privilege escalation stage
        has_db,                            # Database access stage
        has_transfer,                      # Data transfer/movement stage
        (has_scan or has_http),            # Reconnaissance stage
    ]
    distinct_stages = sum(1 for flag in stage_flags if flag)

    source_ip = events[0].source_ip if events else "Unknown"
    assets = list(dict.fromkeys([e.destination_ip for e in events if e.destination_ip]))
    targets_str = ", ".join(assets)

    # 1. Multi-Stage Intrusion: 3 or more kill-chain stages observed
    if distinct_stages >= 3 or (has_success and has_priv and (has_db or has_transfer)):
        attack_type = "Multi-Stage Intrusion"
        summary = (
            f"Correlated multi-stage attack from {source_ip} targeting {targets_str}. "
            f"Sequence demonstrated progression across {distinct_stages} phases including "
            f"authentication, privilege escalation, and data operations."
        )

    # 2. Data access progression (Privilege -> Database -> Data Transfer)
    elif (has_db and has_transfer) or (has_priv and has_db and has_transfer):
        attack_type = "Possible Data Exfiltration"
        summary = (
            f"Suspicious data movement from {source_ip} involving database access and "
            f"subsequent large data transfer targeting {targets_str}."
        )

    # 3. Privilege Escalation progression (Login Success -> Privilege Escalation)
    elif has_priv and (has_success or has_failed):
        attack_type = "Privilege Escalation"
        summary = (
            f"Privilege escalation activity detected from {source_ip} targeting {targets_str} "
            f"following authentication actions."
        )

    # 4. Credential Compromise (Repeated failed logins followed by success)
    elif has_failed and has_success:
        attack_type = "Credential Compromise"
        summary = (
            f"Credential compromise detected from {source_ip}. Successful authentication "
            f"observed following {failed_login_count} failed login attempt(s) on {targets_str}."
        )

    # 5. Brute Force Attempt (Multiple failed logins without success)
    elif has_failed and not has_success:
        attack_type = "Brute Force Attempt"
        summary = (
            f"Repeated authentication brute-force attempts ({failed_login_count} failed logins) "
            f"detected from {source_ip} targeting {targets_str}."
        )

    # 6. Network Reconnaissance (Port scan and/or suspicious HTTP)
    elif has_scan or has_http:
        attack_type = "Network Reconnaissance"
        summary = (
            f"Network reconnaissance and service probing detected from {source_ip} "
            f"targeting {targets_str}."
        )

    # 7. Isolated Database Access
    elif has_db and not has_transfer:
        attack_type = "Suspicious Data Access"
        summary = (
            f"Security-relevant database access operations recorded from {source_ip} "
            f"targeting {targets_str}."
        )

    # 8. Isolated Large Data Transfer
    elif has_transfer and not has_db:
        attack_type = "Large Data Transfer"
        summary = (
            f"High-volume data transfer observed from {source_ip} to {targets_str}."
        )

    else:
        attack_type = "Suspicious Activity"
        summary = f"Correlated suspicious security activity observed from {source_ip} targeting {targets_str}."

    return attack_type, summary
