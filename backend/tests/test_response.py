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


def test_critical_response_policy(client):
    """Verify critical severity incident produces isolation, lockout, urgent task, notification."""
    # Create full multi-stage attack -> critical
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
        "username": "admin",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    })
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

    res = client.post("/incidents/INC-001/response")
    assert res.status_code == 200
    data = res.json()
    assert data["simulation_mode"] is True
    assert len(data["actions"]) == 4

    action_names = [a["action"] for a in data["actions"]]
    assert any("SIMULATE_SOURCE_ISOLATION" in a for a in action_names)
    assert any("SIMULATE_ACCOUNT_LOCKOUT" in a for a in action_names)
    assert any("CREATE_URGENT_IR_TASK" in a for a in action_names)
    assert any("NOTIFY_SECURITY_LEAD" in a for a in action_names)

    # All actions have simulation_mode = True
    assert all(a["simulation_mode"] is True for a in data["actions"])


def test_high_response_policy(client):
    """Verify high severity incident produces IP block, verbose monitoring, IR task."""
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

    res = client.post("/incidents/INC-001/response")
    data = res.json()
    assert len(data["actions"]) == 3
    action_names = [a["action"] for a in data["actions"]]
    assert any("SIMULATE_IP_BLOCK" in a for a in action_names)
    assert any("INCREASE_MONITORING" in a for a in action_names)
    assert any("CREATE_IR_TASK" in a for a in action_names)


def test_medium_response_policy(client):
    """Verify medium severity incident produces monitoring and analyst review."""
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

    res = client.post("/incidents/INC-001/response")
    data = res.json()
    assert len(data["actions"]) == 2
    action_names = [a["action"] for a in data["actions"]]
    assert any("INCREASE_MONITORING" in a for a in action_names)
    assert any("CREATE_ANALYST_REVIEW" in a for a in action_names)


def test_low_response_policy(client):
    """Verify low severity incident produces log event action."""
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

    res = client.post("/incidents/INC-001/response")
    data = res.json()
    assert len(data["actions"]) == 1
    assert "LOG_SECURITY_EVENT" in data["actions"][0]["action"]


def test_duplicate_response_protection(client):
    """Verify multiple executions of POST /incidents/{id}/response do not duplicate rows."""
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

    # First run
    res1 = client.post("/incidents/INC-001/response").json()
    count1 = len(res1["actions"])

    # Second run
    res2 = client.post("/incidents/INC-001/response").json()
    count2 = len(res2["actions"])

    assert count1 == count2

    # Global table has only count1 actions
    all_res = client.get("/responses").json()
    assert len(all_res) == count1


def test_get_incident_response_endpoint(client):
    """Verify GET /incidents/{incident_id}/response returns recorded actions."""
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
    client.post("/incidents/INC-001/response")

    res = client.get("/incidents/INC-001/response")
    assert res.status_code == 200
    actions = res.json()
    assert len(actions) >= 1
    assert actions[0]["incident_id"] == "INC-001"
