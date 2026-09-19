import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app

# Isolated in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_single_login_failed_does_not_trigger_repeated_login(client):
    """1. Single login_failed -> should NOT trigger repeated-login detection."""
    event = {
        "timestamp": "2026-09-19T10:00:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    }
    client.post("/events", json=event)

    res = client.post("/detections/run")
    assert res.status_code == 200
    data = res.json()
    assert data["events_analyzed"] == 1
    assert data["new_detections"] == 0
    assert len(data["detections"]) == 0


def test_five_login_failed_triggers_repeated_login_detection(client):
    """2. Five login_failed events from 10.0.0.200 -> 10.0.0.30 within 5 minutes -> should trigger repeated-login detection."""
    base_time = "2026-09-19T10:0"
    for i in range(5):
        event = {
            "timestamp": f"{base_time}{i}:00",
            "source_ip": "10.0.0.200",
            "destination_ip": "10.0.0.30",
            "username": "admin",
            "event_type": "login_failed",
            "protocol": "TCP",
            "service": "AUTH",
            "status": "failed",
        }
        client.post("/events", json=event)

    res = client.post("/detections/run")
    assert res.status_code == 200
    data = res.json()
    assert data["events_analyzed"] == 5
    assert data["new_detections"] == 1

    det = data["detections"][0]
    assert det["rule_id"] == "AUTH-001"
    assert det["detection_name"] == "Repeated Failed Login Attempts"
    assert det["severity"] == "high"
    assert det["source_ip"] == "10.0.0.200"
    assert det["destination_ip"] == "10.0.0.30"
    assert det["evidence"]["failed_attempts"] == 5


def test_login_success_after_failed_attempts(client):
    """3. login_success after repeated failed logins -> should trigger successful-after-failures detection."""
    # Ingest 3 failed logins
    for i in range(3):
        client.post("/events", json={
            "timestamp": f"2026-09-19T10:0{i}:00",
            "source_ip": "10.0.0.200",
            "destination_ip": "10.0.0.30",
            "username": "admin",
            "event_type": "login_failed",
            "protocol": "TCP",
            "service": "AUTH",
            "status": "failed",
        })

    # Ingest successful login within window
    client.post("/events", json={
        "timestamp": "2026-09-19T10:04:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    })

    res = client.post("/detections/run")
    assert res.status_code == 200
    data = res.json()
    rules_triggered = [d["rule_id"] for d in data["detections"]]
    assert "AUTH-002" in rules_triggered

    auth002 = next(d for d in data["detections"] if d["rule_id"] == "AUTH-002")
    assert auth002["detection_name"] == "Successful Login After Failed Attempts"
    assert auth002["severity"] == "high"
    assert auth002["source_ip"] == "10.0.0.200"
    assert auth002["evidence"]["prior_failed_attempts"] == 3


def test_privilege_escalation_detection(client):
    """4. privilege_escalation -> should trigger detection."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:10:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "root",
        "event_type": "privilege_escalation",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "alert",
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["new_detections"] == 1
    det = data["detections"][0]
    assert det["rule_id"] == "PRIV-001"
    assert det["detection_name"] == "Privilege Escalation Detected"
    assert det["severity"] == "high"


def test_database_access_detection(client):
    """5. database_access -> should produce the database-access detection."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:15:00",
        "source_ip": "10.0.0.10",
        "destination_ip": "10.0.0.20",
        "username": "app_user",
        "event_type": "database_access",
        "protocol": "TCP",
        "service": "MYSQL",
        "status": "success",
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["new_detections"] == 1
    det = data["detections"][0]
    assert det["rule_id"] == "DATA-001"
    assert det["detection_name"] == "Database Access Detected"
    assert det["severity"] == "medium"


def test_large_data_transfer_detection(client):
    """6. large_data_transfer -> should produce the large-transfer detection."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:20:00",
        "source_ip": "10.0.0.20",
        "destination_ip": "10.0.0.200",
        "username": None,
        "event_type": "large_data_transfer",
        "protocol": "TCP",
        "service": "NET",
        "status": "success",
        "metadata": {"bytes": 85000000},
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["new_detections"] == 1
    det = data["detections"][0]
    assert det["rule_id"] == "NET-001"
    assert det["detection_name"] == "Large Data Transfer Detected"
    assert det["severity"] == "medium"


def test_port_scan_detection(client):
    """7. port_scan -> should produce the port-scan detection."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:25:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "port_scan",
        "protocol": "TCP",
        "service": "NGINX",
        "status": "detected",
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["new_detections"] == 1
    det = data["detections"][0]
    assert det["rule_id"] == "SCAN-001"
    assert det["detection_name"] == "Port Scan Detected"
    assert det["severity"] == "medium"


def test_suspicious_http_request_detection(client):
    """8. suspicious_http_request -> should produce the HTTP detection."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:30:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "suspicious_http_request",
        "protocol": "HTTP",
        "service": "NGINX",
        "status": "blocked",
        "metadata": {"uri": "/etc/passwd", "payload": "../../../etc/passwd"},
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["new_detections"] == 1
    det = data["detections"][0]
    assert det["rule_id"] == "WEB-001"
    assert det["detection_name"] == "Suspicious HTTP Request"
    assert det["severity"] == "medium"


def test_unusual_connection_detection(client):
    """9. unusual_connection -> should produce the unusual-connection detection."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:35:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.20",
        "username": None,
        "event_type": "unusual_connection",
        "protocol": "TCP",
        "service": "CUSTOM",
        "status": "detected",
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["new_detections"] == 1
    det = data["detections"][0]
    assert det["rule_id"] == "CONN-001"
    assert det["detection_name"] == "Unusual Network Connection"
    assert det["severity"] == "low"


def test_normal_events_do_not_create_unrelated_detections(client):
    """10. Verify that normal events do not create unrelated detections."""
    # Ingest isolated normal login_success and normal file_access
    client.post("/events", json={
        "timestamp": "2026-09-19T10:40:00",
        "source_ip": "10.0.0.10",
        "destination_ip": "10.0.0.30",
        "username": "valid_user",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:41:00",
        "source_ip": "10.0.0.10",
        "destination_ip": "10.0.0.20",
        "username": "valid_user",
        "event_type": "file_access",
        "protocol": "TCP",
        "service": "FS",
        "status": "success",
    })

    res = client.post("/detections/run")
    data = res.json()
    assert data["events_analyzed"] == 2
    assert data["new_detections"] == 0
    assert len(data["detections"]) == 0


def test_deduplication_on_repeated_runs(client):
    """7. Avoid Duplicates: Multiple POST /detections/run calls do NOT duplicate detections."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:50:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "root",
        "event_type": "privilege_escalation",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "alert",
    })

    # First run creates 1 detection
    run1 = client.post("/detections/run").json()
    assert run1["new_detections"] == 1
    assert len(run1["detections"]) == 1

    # Second run finds 0 new detections
    run2 = client.post("/detections/run").json()
    assert run2["new_detections"] == 0
    assert len(run2["detections"]) == 0

    # Total stored detections remains 1
    all_dets = client.get("/detections").json()
    assert len(all_dets) == 1


def test_detection_stats_endpoint(client):
    """Verify GET /detections/stats returns exact counts by severity."""
    # Ingest 1 high, 2 medium, 1 low
    events = [
        {"timestamp": "2026-09-19T11:00:00", "source_ip": "10.0.0.200", "destination_ip": "10.0.0.30", "username": "root", "event_type": "privilege_escalation", "protocol": "TCP", "service": "AUTH", "status": "alert"},  # high
        {"timestamp": "2026-09-19T11:01:00", "source_ip": "10.0.0.10", "destination_ip": "10.0.0.20", "username": "app", "event_type": "database_access", "protocol": "TCP", "service": "DB", "status": "success"},       # medium
        {"timestamp": "2026-09-19T11:02:00", "source_ip": "10.0.0.20", "destination_ip": "10.0.0.200", "username": None, "event_type": "large_data_transfer", "protocol": "TCP", "service": "NET", "status": "success"},    # medium
        {"timestamp": "2026-09-19T11:03:00", "source_ip": "10.0.0.200", "destination_ip": "10.0.0.10", "username": None, "event_type": "unusual_connection", "protocol": "TCP", "service": "NET", "status": "detected"},   # low
    ]
    for e in events:
        client.post("/events", json=e)

    client.post("/detections/run")

    res = client.get("/detections/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["high"] == 1
    assert stats["medium"] == 2
    assert stats["low"] == 1
    assert stats["critical"] == 0


def test_get_detection_by_id_and_not_found(client):
    """Verify GET /detections/{detection_id} and 404 behavior."""
    client.post("/events", json={
        "timestamp": "2026-09-19T11:10:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "port_scan",
        "protocol": "TCP",
        "service": "NGINX",
        "status": "detected",
    })
    run_res = client.post("/detections/run").json()
    det_id = run_res["detections"][0]["detection_id"]

    # Query by formatted detection_id (e.g. DET-001)
    get_res = client.get(f"/detections/{det_id}")
    assert get_res.status_code == 200
    assert get_res.json()["detection_id"] == det_id

    # Query non-existent detection ID
    missing = client.get("/detections/DET-999")
    assert missing.status_code == 404
    assert "not found" in missing.json()["detail"].lower()
