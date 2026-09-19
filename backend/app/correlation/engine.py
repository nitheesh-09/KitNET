from datetime import datetime, timezone
from typing import List, Tuple, Dict, Set
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from ..models.event import Event
from ..models.detection import Detection
from ..models.incident import Incident
from .rules import generate_timeline, classify_attack_type
from ..detection.rules import parse_timestamp
from ..risk.rules import evaluate_incident_risk

CORRELATION_WINDOW_SECONDS = 1800  # 30 minutes


class CorrelationEngine:
    """
    Synthesizes stored events and detections into storyline-driven security incidents.
    Enforces time window clustering (30m), single event filtering, attack classification,
    and deduplication of open incidents.
    """

    def __init__(self, db: Session):
        self.db = db

    def correlate(self) -> Tuple[int, int, List[Incident]]:
        """
        Execute correlation pass across stored events and detections.
        Returns (incidents_created_count, incidents_updated_count, list_of_incidents).
        """
        events: List[Event] = self.db.query(Event).order_by(Event.id.asc()).all()
        events.sort(key=lambda e: (parse_timestamp(e.timestamp), e.id))

        if not events:
            return 0, 0, []

        detections: List[Detection] = self.db.query(Detection).all()

        # Group events by source_ip
        events_by_source: Dict[str, List[Event]] = {}
        for e in events:
            events_by_source.setdefault(e.source_ip, []).append(e)

        # For each source_ip, partition into 30-minute time clusters
        candidate_clusters: List[List[Event]] = []
        for src_ip, src_events in events_by_source.items():
            current_cluster: List[Event] = []
            for e in src_events:
                if not current_cluster:
                    current_cluster.append(e)
                else:
                    prev_time = parse_timestamp(current_cluster[-1].timestamp)
                    curr_time = parse_timestamp(e.timestamp)
                    gap_seconds = (curr_time - prev_time).total_seconds()

                    if 0 <= gap_seconds <= CORRELATION_WINDOW_SECONDS:
                        current_cluster.append(e)
                    else:
                        candidate_clusters.append(current_cluster)
                        current_cluster = [e]

            if current_cluster:
                candidate_clusters.append(current_cluster)

        # Filter out isolated single events (Test 1 requirement)
        qualified_clusters = [c for c in candidate_clusters if len(c) >= 2]

        existing_incidents: List[Incident] = self.db.query(Incident).all()
        created_incidents: List[Incident] = []
        updated_incidents: List[Incident] = []

        # Find highest existing incident sequence number for readable IDs e.g. INC-001
        highest_num = 0
        for inc in existing_incidents:
            if inc.incident_id and inc.incident_id.startswith("INC-"):
                num_part = inc.incident_id.split("-")[-1]
                if num_part.isdigit():
                    highest_num = max(highest_num, int(num_part))

        # Process each qualified cluster
        for cluster in qualified_clusters:
            cluster_event_ids = set(e.id for e in cluster)
            cluster_src_ip = cluster[0].source_ip
            cluster_start_dt = parse_timestamp(cluster[0].timestamp)

            # Check if this cluster matches an existing incident (Deduplication)
            matched_incident: Incident = None
            for inc in existing_incidents:
                if inc.source_ip == cluster_src_ip and inc.status == "open":
                    existing_ev_ids = set(inc.event_ids or [])
                    # Match if overlapping event IDs exist
                    if existing_ev_ids & cluster_event_ids:
                        matched_incident = inc
                        break
                    # Match if cluster connects to incident timeline within 30m window
                    if inc.timeline:
                        inc_first_time = parse_timestamp(inc.timeline[0]["timestamp"])
                        inc_last_time = parse_timestamp(inc.timeline[-1]["timestamp"])
                        cluster_end_dt = parse_timestamp(cluster[-1].timestamp)
                        gap_after = (cluster_start_dt - inc_last_time).total_seconds()
                        gap_before = (inc_first_time - cluster_end_dt).total_seconds()
                        if (0 <= gap_after <= CORRELATION_WINDOW_SECONDS) or (0 <= gap_before <= CORRELATION_WINDOW_SECONDS):
                            matched_incident = inc
                            break

            # Find all detections corresponding to this cluster's events
            matched_dets = [
                d for d in detections
                if d.event_id in cluster_event_ids or (
                    d.source_ip == cluster_src_ip and
                    parse_timestamp(cluster[0].timestamp) <= parse_timestamp(d.timestamp) <= parse_timestamp(cluster[-1].timestamp)
                )
            ]
            # Deduplicate detections list
            unique_dets = list({d.id: d for d in matched_dets}.values())

            timeline = generate_timeline(cluster)
            affected_assets = list(dict.fromkeys([e.destination_ip for e in cluster if e.destination_ip]))
            attack_type, summary = classify_attack_type(cluster, unique_dets)

            # Evaluate transparent risk score
            risk_breakdown = evaluate_incident_risk(None, unique_dets, cluster)
            risk_score = risk_breakdown["final_score"]
            severity = risk_breakdown["severity"]

            if matched_incident:
                # Update existing incident
                all_ev_ids = sorted(list(set(matched_incident.event_ids or []) | cluster_event_ids))
                all_det_ids = sorted(list(set(matched_incident.detection_ids or []) | set(d.id for d in unique_dets)))

                matched_incident.updated_at = datetime.now(timezone.utc)
                matched_incident.event_count = len(all_ev_ids)
                matched_incident.detection_count = len(all_det_ids)
                matched_incident.timeline = timeline
                matched_incident.affected_assets = affected_assets
                matched_incident.attack_type = attack_type
                matched_incident.summary = summary
                matched_incident.event_ids = all_ev_ids
                matched_incident.detection_ids = all_det_ids
                matched_incident.risk_score = risk_score
                matched_incident.severity = severity
                matched_incident.risk_breakdown = risk_breakdown

                if matched_incident not in updated_incidents:
                    updated_incidents.append(matched_incident)
            else:
                # Create new incident
                highest_num += 1
                new_inc_id_str = f"INC-{highest_num:03d}"

                new_incident = Incident(
                    incident_id=new_inc_id_str,
                    source_ip=cluster_src_ip,
                    primary_destination_ip=cluster[0].destination_ip,
                    attack_type=attack_type,
                    status="open",
                    event_count=len(cluster),
                    detection_count=len(unique_dets),
                    timeline=timeline,
                    affected_assets=affected_assets,
                    summary=summary,
                    event_ids=[e.id for e in cluster],
                    detection_ids=[d.id for d in unique_dets],
                    risk_score=risk_score,
                    severity=severity,
                    risk_breakdown=risk_breakdown,
                )
                self.db.add(new_incident)
                created_incidents.append(new_incident)
                existing_incidents.append(new_incident)

        if created_incidents or updated_incidents:
            self.db.commit()
            for inc in created_incidents:
                self.db.refresh(inc)
            for inc in updated_incidents:
                self.db.refresh(inc)

        all_incidents = self.db.query(Incident).order_by(Incident.id.asc()).all()
        return len(created_incidents), len(updated_incidents), all_incidents
