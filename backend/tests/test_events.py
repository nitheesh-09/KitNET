import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app

# Create isolated in-memory SQLite database for testing
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


def test_health_endpoint(client):
    """Verify GET /health returns status ok and database connected."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "cybernet-backend"
    assert data["database"] == "connected"


def test_post_exact_event(client):
    """Verify POST /events accepts the exact requested event payload and stores it."""
    payload = {
        "timestamp": "2026-09-19T10:32:01",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_failed",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    }

    response = client.post("/events", json=payload)
    assert response.status_code == 201
    created_event = response.json()

    assert "id" in created_event
    assert created_event["id"] is not None
    assert created_event["timestamp"] == "2026-09-19T10:32:01"
    assert created_event["source_ip"] == "10.0.0.200"
    assert created_event["destination_ip"] == "10.0.0.30"
    assert created_event["username"] == "admin"
    assert created_event["event_type"] == "login_failed"
    assert created_event["protocol"] == "TCP"
    assert created_event["service"] == "AUTH"
    assert created_event["status"] == "failed"


def test_get_events_list(client):
    """Verify GET /events returns the stored event list with pagination."""
    payload = {
        "timestamp": "2026-09-19T10:32:08",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "login_success",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "success",
    }
    client.post("/events", json=payload)

    response = client.get("/events?limit=10&offset=0")
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
    assert len(events) >= 1
    assert events[0]["event_type"] == "login_success"


def test_get_event_by_id(client):
    """Verify GET /events/{id} returns the specific event."""
    payload = {
        "timestamp": "2026-09-19T10:32:15",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "root",
        "event_type": "privilege_escalation",
        "protocol": "TCP",
        "service": "AUTH",
        "status": "alert",
    }
    post_res = client.post("/events", json=payload)
    event_id = post_res.json()["id"]

    get_res = client.get(f"/events/{event_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == event_id
    assert data["event_type"] == "privilege_escalation"
    assert data["username"] == "root"


def test_get_event_not_found(client):
    """Verify GET /events/{id} returns 404 for non-existent event ID."""
    response = client.get("/events/99999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_reject_invalid_event_type(client):
    """Verify POST /events rejects unknown event_type with 422 Unprocessable Entity."""
    payload = {
        "timestamp": "2026-09-19T10:32:01",
        "source_ip": "10.0.0.200",
        "destination_ip": "10.0.0.30",
        "username": "admin",
        "event_type": "arbitrary_unknown_attack",  # Invalid type
        "protocol": "TCP",
        "service": "AUTH",
        "status": "failed",
    }
    response = client.post("/events", json=payload)
    assert response.status_code == 422


def test_allow_null_username(client):
    """Verify username can be null when an event does not involve a user."""
    payload = {
        "timestamp": "2026-09-19T09:14:02",
        "source_ip": "10.0.0.201",
        "destination_ip": "10.0.0.10",
        "username": None,
        "event_type": "port_scan",
        "protocol": "TCP",
        "service": "NGINX",
        "status": "detected",
    }
    response = client.post("/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] is None
    assert data["event_type"] == "port_scan"


def test_allow_optional_metadata(client):
    """Verify optional metadata JSON object is stored and returned."""
    payload = {
        "timestamp": "2026-09-19T10:32:40",
        "source_ip": "10.0.0.20",
        "destination_ip": "10.0.0.200",
        "username": "service_db_usr",
        "event_type": "large_data_transfer",
        "protocol": "TCP",
        "service": "MYSQL",
        "status": "flagged",
        "metadata": {
            "bytes_transferred": 44882100,
            "table": "customer_vault",
            "db_port": 3306,
        },
    }
    response = client.post("/events", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["metadata"] is not None
    assert data["metadata"]["bytes_transferred"] == 44882100
    assert data["metadata"]["table"] == "customer_vault"
