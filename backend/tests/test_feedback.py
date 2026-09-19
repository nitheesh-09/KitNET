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


def test_submit_valid_feedback(client):
    """Verify creating feedback for confirmed_threat, false_positive, needs_review."""
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

    labels = ["confirmed_threat", "false_positive", "needs_review"]
    for lbl in labels:
        res = client.post(
            "/incidents/INC-001/feedback",
            json={"analyst_label": lbl, "feedback": f"Analyst test note for {lbl}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["incident_id"] == "INC-001"
        assert data["analyst_label"] == lbl
        assert data["feedback"] == f"Analyst test note for {lbl}"


def test_retrieve_feedback_history(client):
    """Verify GET /incidents/{incident_id}/feedback returns all submitted records."""
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

    client.post(
        "/incidents/INC-001/feedback",
        json={"analyst_label": "confirmed_threat", "feedback": "First note"},
    )
    client.post(
        "/incidents/INC-001/feedback",
        json={"analyst_label": "needs_review", "feedback": "Second note"},
    )

    get_res = client.get("/incidents/INC-001/feedback")
    assert get_res.status_code == 200
    entries = get_res.json()
    assert len(entries) == 2


def test_reject_invalid_label(client):
    """Verify invalid analyst label is rejected with 422 Unprocessable Entity."""
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

    bad_res = client.post(
        "/incidents/INC-001/feedback",
        json={"analyst_label": "completely_invalid_label", "feedback": "Bad label note"},
    )
    assert bad_res.status_code == 422


def test_feedback_does_not_mutate_risk_score(client):
    """Verify submitting feedback does NOT modify the deterministic risk score."""
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

    before_inc = client.get("/incidents/INC-001").json()
    initial_score = before_inc["risk_score"]

    client.post(
        "/incidents/INC-001/feedback",
        json={"analyst_label": "false_positive", "feedback": "Claiming false positive"},
    )

    after_inc = client.get("/incidents/INC-001").json()
    assert after_inc["risk_score"] == initial_score
