from typing import List, Dict, Any
from ..models.incident import Incident


def determine_policy_actions(incident: Incident) -> List[Dict[str, str]]:
    """
    Determine safe simulated response actions strictly according to prototype policy:
    LOW: log event
    MEDIUM: increase monitoring, create analyst review
    HIGH: simulate blocking source IP, increase monitoring, create incident response task
    CRITICAL: simulate source IP isolation, simulate disabling compromised account,
              create urgent incident response task, notify administrator
    """
    severity = (incident.severity or "low").lower()
    source_ip = incident.source_ip
    attack_type = incident.attack_type

    actions: List[Dict[str, str]] = []

    if severity == "critical":
        actions = [
            {
                "action": f"SIMULATE_SOURCE_ISOLATION: Isolate rogue host {source_ip}",
                "reason": f"Critical threat severity ({attack_type}). Virtual sandbox perimeter rule: DROP all traffic from {source_ip}.",
            },
            {
                "action": "SIMULATE_ACCOUNT_LOCKOUT: Disable compromised credentials",
                "reason": "Prevent credential reuse across internal authentication endpoints.",
            },
            {
                "action": "CREATE_URGENT_IR_TASK: Dispatch Tier 3 Incident Response",
                "reason": "Multi-stage attack pattern requires urgent forensics on affected hosts.",
            },
            {
                "action": "NOTIFY_SECURITY_LEAD: Automated high-priority incident alert",
                "reason": "Broadcast critical security alert to SOC management.",
            },
        ]

    elif severity == "high":
        actions = [
            {
                "action": f"SIMULATE_IP_BLOCK: Block source IP {source_ip}",
                "reason": f"High risk intrusion attempt detected from {source_ip}.",
            },
            {
                "action": "INCREASE_MONITORING: Enable verbose telemetry on target assets",
                "reason": "Capture lateral movement attempts targeting internal hosts.",
            },
            {
                "action": "CREATE_IR_TASK: Queue incident triage playbook",
                "reason": "Assign case to SOC analyst for containment verification.",
            },
        ]

    elif severity == "medium":
        actions = [
            {
                "action": "INCREASE_MONITORING: Enable focused telemetry logging",
                "reason": "Medium risk anomaly observed; elevated logging active.",
            },
            {
                "action": "CREATE_ANALYST_REVIEW: Flag for routine triage review",
                "reason": "Validate whether observed activity represents benign or suspicious pattern.",
            },
        ]

    else:  # low
        actions = [
            {
                "action": "LOG_SECURITY_EVENT: Retain telemetry in security event archive",
                "reason": "Low severity baseline activity; logged for baseline tracking.",
            },
        ]

    return actions
