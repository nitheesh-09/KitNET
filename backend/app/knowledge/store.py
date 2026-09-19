"""
Local RAG-style Knowledge Layer for Cybersecurity Incident Investigation.
Contains curated reference documents used to contextualize investigations deterministically.
"""

from typing import List, Dict, Set, Any


KNOWLEDGE_DOCUMENTS: Dict[str, Dict[str, Any]] = {
    "brute_force": {
        "title": "Brute Force Authentication Attacks",
        "tags": ["brute force", "login_failed", "auth-001", "authentication"],
        "content": (
            "Brute force attacks involve automated repeated authentication attempts against a service "
            "(SSH, HTTP Auth, Kerberos). Indicators include rapid failed logins from a single source IP "
            "targeting one or multiple accounts. Key investigation steps: verify whether authentication "
            "ultimately succeeded, check if credentials were leaked or default, and determine if IP is "
            "external rogue or compromised internal asset."
        ),
    },
    "authentication_attacks": {
        "title": "Credential Compromise and Account Takeover",
        "tags": ["credential compromise", "login_success", "auth-002", "authentication"],
        "content": (
            "A successful login immediately preceded by multiple failed attempts indicates credential compromise "
            "or dictionary breakthrough. SOC analysts must verify: anomalous login time, unexpected source geolocation/IP, "
            "and subsequent unauthorized commands or privilege escalation attempts from the newly authenticated session."
        ),
    },
    "privilege_escalation": {
        "title": "Privilege Escalation Techniques",
        "tags": ["privilege escalation", "privilege_escalation", "priv-001", "root", "sudo"],
        "content": (
            "Privilege escalation occurs when an attacker exploits a misconfiguration, sudo weakness, or system "
            "vulnerability to transition from a standard user to administrative/root privileges. Immediate containment "
            "requires verifying the parent process, checking authorization for the target role, and isolating active sessions."
        ),
    },
    "database_access": {
        "title": "Database Access and Query Anomaly Investigation",
        "tags": ["database access", "database_access", "data-001", "mysql", "postgres", "database"],
        "content": (
            "Database access events represent interactions with core data stores. While common in production, unexpected "
            "direct connections from unauthorized hosts or following privilege escalation are security-relevant. "
            "Analysts must correlate accessed tables (e.g. user vaults, credentials) with normal application traffic "
            "and inspect volume."
        ),
    },
    "suspicious_data_transfer": {
        "title": "Suspicious Large Data Transfer and Potential Exfiltration",
        "tags": ["data transfer", "large_data_transfer", "net-001", "exfiltration", "lateral movement"],
        "content": (
            "High-volume data transfers between internal hosts or toward external IPs indicate potential data exfiltration "
            "or staging. However, large transfers can also reflect legitimate backups. Analysts must evaluate transfer size, "
            "destination host reputation, and whether the transfer was preceded by database access or compromised credentials."
        ),
    },
    "network_reconnaissance": {
        "title": "Network Port Scanning and Service Probing",
        "tags": ["reconnaissance", "port scan", "port_scan", "scan-001", "suspicious_http_request", "web-001"],
        "content": (
            "Reconnaissance involves scanning IP ranges and service ports (SYN scans, banner grabbing, web dirbusting) "
            "to discover active services and vulnerabilities. While low impact on integrity, reconnaissance is typically "
            "the initial phase of an intrusion campaign."
        ),
    },
    "incident_investigation": {
        "title": "Multi-Stage Kill-Chain Incident Investigation",
        "tags": ["multi-stage", "multi-stage intrusion", "incident", "kill-chain", "intrusion"],
        "content": (
            "Multi-stage intrusions connect initial access, reconnaissance, credential abuse, privilege escalation, "
            "and data movement into a cohesive attack sequence. Correlation requires establishing causal temporal "
            "links between events and evaluating affected asset lateral traversal paths."
        ),
    },
    "evidence_interpretation": {
        "title": "Evidence-Based Interpretation and Uncertainty Handling",
        "tags": ["evidence", "interpretation", "uncertainty", "analysis"],
        "content": (
            "SOC investigations must strictly separate observed telemetry facts from inferred attacker intent. "
            "Analysts should state uncertainty when direct telemetry is ambiguous (e.g. distinguishing data staging "
            "from legitimate backup) and recommend non-destructive verification steps."
        ),
    },
}


def retrieve_knowledge(
    attack_type: str = "",
    event_types: List[str] = None,
    detection_names: List[str] = None,
) -> List[str]:
    """
    Deterministic keyword retrieval of relevant investigation guidelines.
    Matches tags against attack_type, event_types, and detection_names.
    Always includes evidence_interpretation for analytical rigor.
    """
    event_types = event_types or []
    detection_names = detection_names or []

    search_terms: Set[str] = set()
    search_terms.add(attack_type.lower())
    for et in event_types:
        search_terms.add(et.lower())
    for dn in detection_names:
        search_terms.add(dn.lower())

    matched_docs: List[str] = []

    for doc_id, doc in KNOWLEDGE_DOCUMENTS.items():
        # Check if any tag matches search terms
        is_match = any(
            tag in term or term in tag
            for tag in doc["tags"]
            for term in search_terms
        )
        if is_match or doc_id == "evidence_interpretation":
            matched_docs.append(f"### {doc['title']}\n{doc['content']}")

    return matched_docs
