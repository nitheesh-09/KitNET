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


def test_single_event_not_an_incident(client):
    """Test 1 — Single event: One isolated event should NOT automatically become a multi-stage incident."""
    client.post("/events", json={
        "timestamp": "2026-09-19T10:00:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    })
    client.post("/detections/run")

    res = client.post("/incidents/correlate")
    assert res.status_code == 200
    data = res.json()
    assert data["incidents_created"] == 0
    assert len(data["incidents"]) == 0


def test_brute_force_incident(client):
    """Test 2 — Brute force: Multiple failed logins from same source should create a correlated security incident."""
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

    res = client.post("/incidents/correlate")
    assert res.status_code == 200
    data = res.json()
    assert data["incidents_created"] == 1
    assert len(data["incidents"]) == 1

    inc = data["incidents"][0]
    assert inc["incident_id"] == "INC-001"
    assert inc["source_ip"] == "10.0.0.200"
    assert inc["primary_destination_ip"] == "10.0.0.30"
    assert inc["attack_type"] == "Brute Force Attempt"
    assert inc["event_count"] == 5
    assert len(inc["timeline"]) == 5


def test_authentication_progression(client):
    """Test 3 — Authentication progression: login_failed x multiple -> login_success should correlate."""
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

    client.post("/events", json={
        "timestamp": "2026-09-19T10:05:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    })
    client.post("/detections/run")

    res = client.post("/incidents/correlate")
    assert res.status_code == 200
    data = res.json()
    assert data["incidents_created"] == 1
    inc = data["incidents"][0]
    assert inc["attack_type"] == "Credential Compromise"
    assert inc["event_count"] == 4


def test_privilege_escalation_progression(client):
    """Test 4 — Privilege escalation: login_success -> privilege_escalation should correlate."""
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

    res = client.post("/incidents/correlate")
    data = res.json()
    assert data["incidents_created"] == 1
    inc = data["incidents"][0]
    assert inc["attack_type"] == "Privilege Escalation"
    assert inc["event_count"] == 2


def test_data_access_progression(client):
    """Test 5 — Data access progression: privilege_escalation -> database_access -> large_data_transfer should produce one correlated storyline."""
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
    client.post("/events", json={
        "timestamp": "2026-09-19T10:12:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.20",
        "username": "app_user",
        "event_type": "database_access",
        "protocol": "TCP",
        "service": "DB",
        "status": "success",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:15:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.20",
        "username": None,
        "event_type": "large_data_transfer",
        "protocol": "TCP",
        "service": "NET",
        "status": "success",
    })
    client.post("/detections/run")

    res = client.post("/incidents/correlate")
    data = res.json()
    assert data["incidents_created"] == 1
    inc = data["incidents"][0]
    assert inc["event_count"] == 3
    assert len(inc["affected_assets"]) == 2
    assert "10.0.0.30" in inc["affected_assets"]
    assert "10.0.0.20" in inc["affected_assets"]


def test_full_attack_sequence(client):
    """Test 6 — Full attack sequence: multiple login_failed, login_success, privilege_escalation, database_access, large_data_transfer."""
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

    # Success
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

    res = client.post("/incidents/correlate")
    assert res.status_code == 200
    data = res.json()
    assert data["incidents_created"] == 1
    assert len(data["incidents"]) == 1

    inc = data["incidents"][0]
    assert inc["incident_id"] == "INC-001"
    assert inc["attack_type"] == "Multi-Stage Intrusion"
    assert inc["event_count"] == 9
    assert len(inc["timeline"]) == 9
    assert "10.0.0.30" in inc["affected_assets"]
    assert "10.0.0.20" in inc["affected_assets"]

    # Verify chronological timeline
    timestamps = [t["timestamp"] for t in inc["timeline"]]
    assert timestamps == sorted(timestamps)


def test_different_attackers_not_merged(client):
    """Test 7 — Different attacker: Events from different source IP should not be incorrectly merged."""
    # Attacker 1 (10.0.0.200)
    for i in range(2):
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

    # Attacker 2 (10.0.0.205)
    for i in range(2):
        client.post("/events", json={
            "timestamp": f"2026-09-19T10:0{i}:00",
            "source_ip": "10.0.0.205",
            "destination_ip": "10.0.0.10",
            "username": None,
            "event_type": "port_scan",
            "protocol": "TCP",
            "service": "NGINX",
            "status": "detected",
        })

    client.post("/detections/run")
    res = client.post("/incidents/correlate")
    data = res.json()
    assert data["incidents_created"] == 2
    sources = [i["source_ip"] for i in data["incidents"]]
    assert "10.0.0.200" in sources
    assert "10.0.0.205" in sources


def test_outside_time_window_not_correlated(client):
    """Test 8 — Outside time window: Events separated by more than 30 minutes should not automatically be correlated."""
    # Cluster 1: 10:00 to 10:05
    client.post("/events", json={
        "timestamp": "2026-09-19T10:00:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T10:05:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    })

    # Cluster 2: 11:00 to 11:05 (> 50 minutes after Cluster 1)
    client.post("/events", json={
        "timestamp": "2026-09-19T11:00:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    })
    client.post("/events", json={
        "timestamp": "2026-09-19T11:05:00",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    })

    client.post("/detections/run")
    res = client.post("/incidents/correlate")
    data = res.json()
    assert data["incidents_created"] == 2
    assert len(data["incidents"]) == 2


def test_deduplication_on_repeated_runs(client):
    """Test 9 — Deduplication: Running correlation twice should not create duplicate incidents."""
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

    # First run creates 1 incident
    res1 = client.post("/incidents/correlate").json()
    assert res1["incidents_created"] == 1
    assert len(res1["incidents"]) == 1

    # Second run creates 0 incidents, updates 0 (or retains state)
    res2 = client.post("/incidents/correlate").json()
    assert res2["incidents_created"] == 0
    assert len(res2["incidents"]) == 1

    # Database still contains exactly 1 incident
    all_inc = client.get("/incidents").json()
    assert len(all_inc) == 1


def test_incident_stats_and_detail_endpoint(client):
    """Test 10 — Stats and Detail: GET /incidents/stats and GET /incidents/{incident_id}."""
    for i in range(2):
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

    # Stats
    stats_res = client.get("/incidents/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total"] == 1
    assert stats["open"] == 1
    assert stats["closed"] == 0

    # Detail
    detail_res = client.get("/incidents/INC-001")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["incident_id"] == "INC-001"
    assert "related_events" in detail
    assert len(detail["related_events"]) == 2
    assert "related_detections" in detail
    assert "timeline" in detail

    # 404 check
    missing = client.get("/incidents/INC-999")
    assert missing.status_code == 404
