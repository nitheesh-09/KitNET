import os
import pytest
from backend.app.telemetry.json_adapter import JsonTelemetryAdapter
from backend.app.schemas.event import EventCreate, EventType


def test_json_adapter_single_dict():
    adapter = JsonTelemetryAdapter()
    raw = {
        "timestamp": "2026-09-19T10:32:01",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    }
    event = adapter.normalize_event(raw)
    assert isinstance(event, EventCreate)
    assert event.source_ip == "10.0.0.200"
    assert event.event_type == EventType.LOGIN_FAILED


def test_json_adapter_load_file():
    adapter = JsonTelemetryAdapter()
    test_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "test_data",
        "attack_sequence.json",
    )
    events = adapter.load_events(test_file_path)
    assert len(events) == 9
    assert all(isinstance(e, EventCreate) for e in events)

    # Verify key progression sequence
    types = [e.event_type.value for e in events]
    assert types[0] == "login_failed"
    assert types[5] == "login_success"
    assert types[6] == "privilege_escalation"
    assert types[7] == "database_access"
    assert types[8] == "large_data_transfer"


def test_json_adapter_raw_json_string():
    adapter = JsonTelemetryAdapter()
    raw_str = """
    [
      {
        "timestamp": "2026-09-19T10:32:01",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed"
      }
    ]
    """
    events = adapter.load_events(raw_str)
    assert len(events) == 1
    assert events[0].event_type == EventType.LOGIN_FAILED
