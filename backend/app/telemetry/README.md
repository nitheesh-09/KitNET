# Telemetry Adapter Architecture & Future Network Integration

## Overview
The `telemetry/` package defines a clean, modular abstraction boundary between external network/log telemetry sources and the CYBERNET security pipeline.

---

## Architecture Flow

### CURRENT ARCHITECTURE (TEST / SIMULATION)
```
[ backend/test_data/attack_sequence.json ]
                   ↓
         JsonTelemetryAdapter
                   ↓
             POST /events
                   ↓
              SQLite DB
                   ↓
          Detection Engine
                   ↓
         Correlation Engine
                   ↓
            Risk Scoring
                   ↓
          AI Investigation
                   ↓
         Simulated Response
```

### FUTURE NETWORK INTEGRATION (DOCKER TELEMETRY)
When the partner's simulated Docker network is integrated, it will plug into this adapter interface without altering any downstream components:

```
[ Docker Network / Linux auditd / Zeek / Packet Sensors ]
                   ↓
        DockerTelemetryAdapter (implements BaseTelemetryAdapter)
                   ↓
             POST /events
                   ↓
     (Zero changes to Detection, Correlation, Risk, AI, Response, or Frontend)
```

---

## Extension Guide
To connect a real network source:
1. Inherit from `BaseTelemetryAdapter` (`base.py`).
2. Implement `normalize_event(raw_data) -> EventCreate` mapping container packet captures, syslog, or suricata logs into standard event fields (`timestamp`, `source_ip`, `destination_ip`, `event_type`, `protocol`, `service`, `status`).
3. Stream the normalized events into `POST /events`.
