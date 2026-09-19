import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.risk.rules import map_score_to_severity

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


def test_severity_threshold_mapping():
    """8. Severity matches the defined prototype thresholds: 0-29 Low, 30-59 Medium, 60-79 High, 80-100 Critical."""
    assert map_score_to_severity(0) == "low"
    assert map_score_to_severity(29) == "low"
    assert map_score_to_severity(30) == "medium"
    assert map_score_to_severity(59) == "medium"
    assert map_score_to_severity(60) == "high"
    assert map_score_to_severity(79) == "high"
    assert map_score_to_severity(80) == "critical"
    assert map_score_to_severity(100) == "critical"


def test_low_risk_incident(client):
    """1. Low-risk incident (score 0-29 -> low)."""
    # 2 unusual_connection events (low severity detection)
    client.post("/events", json={
        "timestamp": "2026-09-19T10:00:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "unusual_connection",
        "protocol": "TCP",
        "service": "CUSTOM",
        "status": "detected",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:02:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "unusual_connection",
        "protocol": "TCP",
        "service": "CUSTOM",
        "status": "detected",
    })

    client.post("/detections/run")
    client.post("/incidents/correlate")

    res = client.get("/incidents/INC-001")
    assert res.status_code == 200
    data = res.json()
    assert 0 <= data["risk_score"] <= 29
    assert data["severity"] == "low"


def test_medium_risk_incident(client):
    """2. Medium-risk incident (score 30-59 -> medium)."""
    # 5 failed logins alone (Brute Force):
    # Detections: 1 high (30)
    # Stage: Auth (10)
    # Multi-stage: 0
    # Repetition: +10
    # Total = 50 -> medium (30-59)
    for i in range(5):
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

    client.post("/detections/run")
    client.post("/incidents/correlate")

    res = client.get("/incidents/INC-001")
    assert res.status_code == 200
    data = res.json()
    assert 30 <= data["risk_score"] <= 59
    assert data["severity"] == "medium"
    assert data["risk_score"] == 50


def test_high_risk_incident(client):
    """3. High-risk incident (score 60-79 -> high)."""
    # Login success followed by privilege escalation:
    # Detections: 1 high PRIV-001 (30)
    # Stages: Auth (10) + Priv (20) = 30
    # Multi-stage: 2 stages (+10)
    # Repetition: 0
    # Total = 30 + 30 + 10 = 70 -> high (60-79)
    client.post("/events", json={
        "timestamp": "2026-09-19T10:00:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:02:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "root",
        "event_type": "privilege_escalation",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "alert",
    })

    client.post("/detections/run")
    client.post("/incidents/correlate")

    res = client.get("/incidents/INC-001")
    assert res.status_code == 200
    data = res.json()
    assert 60 <= data["risk_score"] <= 79
    assert data["severity"] == "high"
    assert data["risk_score"] == 70


def test_critical_risk_incident_full_attack(client):
    """4. Critical-risk incident & full multi-stage attack (score 80-100 -> critical)."""
    # 5 failed logins
    for i in range(5):
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

    # Successful login
    client.post("/events", json={
        "timestamp": "2026-09-19T10:06:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    })

    # Privilege escalation
    client.post("/events", json={
        "timestamp": "2026-09-19T10:08:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "root",
        "event_type": "privilege_escalation",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "alert",
    })

    # Database access
    client.post("/events", json={
        "timestamp": "2026-09-19T10:11:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.20",
        "username": "root",
        "event_type": "database_access",
        "protocol": "TCP",
        "service": "DB",
        "status": "success",
    })

    # Large data transfer
    client.post("/events", json={
        "timestamp": "2026-09-19T10:14:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.20",
        "username": None,
        "event_type": "large_data_transfer",
        "protocol": "TCP",
        "service": "NET",
        "status": "success",
    })

    client.post("/detections/run")
    client.post("/incidents/correlate")

    res = client.get("/incidents/INC-001")
    assert res.status_code == 200
    data = res.json()
    assert 80 <= data["risk_score"] <= 100
    assert data["severity"] == "critical"
    assert data["risk_score"] == 100


def test_score_clamping_bounds(client):
    """5 & 6. Score never exceeds 100 and never goes below 0."""
    # Create multi-stage attack that generates > 100 raw points
    for i in range(5):
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
    client.post("/events", json={
        "timestamp": "2026-09-19T10:06:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "root",
        "event_type": "privilege_escalation",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "alert",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:08:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.20",
        "username": "root",
        "event_type": "database_access",
        "protocol": "TCP",
        "service": "DB",
        "status": "success",
    })

    client.post("/detections/run")
    client.post("/incidents/correlate")

    res = client.get("/incidents/INC-001")
    data = res.json()
    assert data["risk_score"] <= 100
    assert data["risk_score"] >= 0


def test_transparent_risk_breakdown_structure(client):
    """7. Risk breakdown is returned with all required components."""
    for i in range(5):
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

    client.post("/detections/run")
    client.post("/incidents/correlate")

    res = client.get("/incidents/INC-001")
    data = res.json()
    assert "risk_breakdown" in data
    rb = data["risk_breakdown"]
    assert "detection_severity_points" in rb
    assert "attack_stage_points" in rb
    assert "multi_stage_points" in rb
    assert "repetition_points" in rb
    assert "final_score" in rb
    assert "severity" in rb


def test_deterministic_calculation(client):
    """9. Risk calculation is deterministic: repeated calls produce identical results."""
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

    client.post("/detections/run")
    client.post("/incidents/correlate")

    # Call POST /incidents/INC-001/risk multiple times
    res1 = client.post("/incidents/INC-001/risk").json()
    res2 = client.post("/incidents/INC-001/risk").json()

    assert res1["risk_score"] == res2["risk_score"]
    assert res1["severity"] == res2["severity"]
    assert res1["risk_breakdown"] == res2["risk_breakdown"]


def test_stats_endpoint_includes_severity_breakdown(client):
    """Verify GET /incidents/stats returns severity counts breakdown."""
    # Incident 1: 5 failed logins -> medium (50)
    for i in range(5):
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

    # Incident 2: different attacker 10.0.0.205 -> 2 unusual connections -> low (20)
    client.post("/events", json={
        "timestamp": "2026-09-19T10:00:00",
        "source_ip": "10.0.0.205",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "unusual_connection",
        "protocol": "TCP",
        "service": "CUSTOM",
        "status": "detected",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:02:00",
        "source_ip": "10.0.0.205",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "unusual_connection",
        "protocol": "TCP",
        "service": "CUSTOM",
        "status": "detected",
    })

    client.post("/detections/run")
    client.post("/incidents/correlate")

    stats = client.get("/incidents/stats").json()
    assert stats["total"] == 2
    assert "severity" in stats
    assert stats["severity"]["medium"] == 1
    assert stats["severity"]["low"] == 1
    assert stats["severity"]["high"] == 0
    assert stats["severity"]["critical"] == 0
