import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.telemetry.json_adapter import JsonTelemetryAdapter

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


def test_complete_end_to_end_security_pipeline(client):
    """
    Verify complete pipeline from raw test telemetry JSON -> Event Ingestion ->
    Detection Engine -> Event Correlation -> Risk Scoring -> Simulated Response ->
    Analyst Feedback -> System Status.
    """
    # 1. Telemetry Adapter: Load attack sequence
    adapter = JsonTelemetryAdapter()
    test_file_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "test_data",
        "attack_sequence.json",
    )
    events = adapter.load_events(test_file_path)
    assert len(events) == 9

    # 2. Ingest events into FastAPI
    for ev in events:
        post_res = client.post("/events", json=ev.model_dump())
        assert post_res.status_code == 201

    events_list = client.get("/events").json()
    assert len(events_list) == 9

    # 3. Detection Engine
    det_run = client.post("/detections/run").json()
    assert det_run["status"] == "success"
    assert det_run["events_analyzed"] == 9
    assert det_run["new_detections"] >= 4

    det_stats = client.get("/detections/stats").json()
    assert det_stats["high"] >= 2  # AUTH-001 or AUTH-002, PRIV-001

    # 4. Correlation Engine
    corr_run = client.post("/incidents/correlate").json()
    assert corr_run["incidents_created"] == 1
    inc = corr_run["incidents"][0]
    inc_id = inc["incident_id"]
    assert inc_id == "INC-001"
    assert inc["attack_type"] == "Multi-Stage Intrusion"
    assert inc["event_count"] == 9
    assert len(inc["affected_assets"]) >= 2

    # 5. Risk Scoring Engine
    risk_res = client.post(f"/incidents/{inc_id}/risk")
    assert risk_res.status_code == 200
    risk_data = risk_res.json()
    assert risk_data["risk_score"] >= 80
    assert risk_data["severity"] == "critical"
    assert "risk_breakdown" in risk_data

    # 6. Response Engine (Safe Simulation)
    resp_res = client.post(f"/incidents/{inc_id}/response")
    assert resp_res.status_code == 200
    resp_data = resp_res.json()
    assert resp_data["simulation_mode"] is True
    assert len(resp_data["actions"]) == 4

    # 7. Analyst Feedback
    fb_res = client.post(
        f"/incidents/{inc_id}/feedback",
        json={"analyst_label": "confirmed_threat", "feedback": "Correlated multi-stage attack confirmed malicious by SOC Tier 2."},
    )
    assert fb_res.status_code == 201

    fb_history = client.get(f"/incidents/{inc_id}/feedback").json()
    assert len(fb_history) == 1
    assert fb_history[0]["analyst_label"] == "confirmed_threat"

    # 8. Query final incident detail
    detail = client.get(f"/incidents/{inc_id}").json()
    assert detail["risk_score"] == risk_data["risk_score"]
    assert detail["severity"] == "critical"
    assert len(detail["related_events"]) == 9
    assert len(detail["related_detections"]) >= 4

    # 9. System Status Check
    sys_status = client.get("/system/status").json()
    assert sys_status["status"] == "healthy"
    assert sys_status["components"]["fastapi"]["status"] == "online"
    assert sys_status["components"]["detection_engine"]["status"] == "active"
    assert sys_status["components"]["response_engine"]["simulation_mode"] is True
