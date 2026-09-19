import os
import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from openai import AuthenticationError

from backend.app.config import get_openai_api_key, get_openai_model
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.knowledge.store import retrieve_knowledge, KNOWLEDGE_DOCUMENTS
from backend.app.ai.prompt import build_investigation_prompt, SYSTEM_PROMPT
from backend.app.ai.schemas import AIInvestigationOutput

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


def test_knowledge_retrieval():
    """Verify deterministic keyword-based RAG retrieval."""
    docs = retrieve_knowledge(
        attack_type="Brute Force Attempt",
        event_types=["login_failed"],
        detection_names=["Repeated Failed Login Attempts"],
    )
    assert len(docs) >= 1
    # Check that brute force content was retrieved
    combined = " ".join(docs).lower()
    assert "brute force" in combined
    assert "evidence-based interpretation" in combined


def test_prompt_construction():
    """Verify prompt clearly separates evidence from inference and injects RAG context."""
    incident = {
        "incident_id": "INC-001",
        "source_ip": "10.0.0.200",
        "primary_destination_ip": "10.0.0.30",
        "attack_type": "Multi-Stage Intrusion",
        "risk_score": 100,
        "severity": "critical",
        "affected_assets": ["10.0.0.30", "10.0.0.20"],
        "timeline": [
            {"timestamp": "2026-09-19T10:00:00", "event_id": 1, "event_type": "login_failed", "description": "Failed login"},
        ],
    }
    docs = ["### Reference Doc\nSample guidelines"]
    prompt = build_investigation_prompt(incident, [], [], docs)

    assert "OBSERVED TELEMETRY EVIDENCE" in prompt
    assert "INC-001" in prompt
    assert "10.0.0.200" in prompt
    assert "Sample guidelines" in prompt
    assert "STRICT ADHERENCE TO EVIDENCE" in SYSTEM_PROMPT


def test_openai_env_helpers():
    """Verify OpenAI settings are read from environment without exposing secrets."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": "  sk-test-key  ", "OPENAI_MODEL": "gpt-4o-mini"}, clear=False):
        assert get_openai_api_key() == "sk-test-key"
        assert get_openai_model() == "gpt-4o-mini"

    with patch.dict(os.environ, {"OPENAI_API_KEY": "   "}, clear=False):
        assert get_openai_api_key() is None


def test_missing_api_key_returns_503(client):
    """Verify missing OPENAI_API_KEY returns clean 503 error without crashing application."""
    # Seed an incident
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
        "timestamp": "2026-09-19T10:01:00",
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

    with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
        # Also remove if present
        if "OPENAI_API_KEY" in os.environ:
            del os.environ["OPENAI_API_KEY"]

        res = client.post("/incidents/INC-001/investigate")
        assert res.status_code == 503
        assert "not configured" in res.json()["detail"].lower()


def test_mocked_openai_investigation(client):
    """Verify successful AI investigation with mocked OpenAI client."""
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

    mock_analysis = {
        "incident_id": "INC-001",
        "summary": "Automated brute-force password spraying observed targeting the AUTH server.",
        "attack_progression": [
            "Phase 1: Initial automated credential probing against admin account",
        ],
        "key_evidence": [
            "Multiple failed logins from 10.0.0.200 targeting 10.0.0.30",
        ],
        "affected_assets": ["10.0.0.30"],
        "likely_attack_category": "Brute Force Attempt",
        "confidence": "high",
        "reasoning": "High frequency of failed attempts within seconds is consistent with automated tooling.",
        "recommended_actions": [
            "Simulate blocking source IP 10.0.0.200",
            "Inspect target account lock status",
        ],
        "limitations": [
            "Payload inspection unavailable; password dictionary undetermined",
        ],
    }

    mock_chat_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = json.dumps(mock_analysis)
    mock_chat_completion.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_chat_completion

    with patch("backend.app.ai.engine.OpenAI", return_value=mock_client):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-mock-key"}):
            res = client.post("/incidents/INC-001/investigate")
            assert res.status_code == 200
            data = res.json()
            assert data["incident_id"] == "INC-001"
            assert data["confidence"] == "high"
            assert len(data["recommended_actions"]) == 2

            # Verify incident in database has stored AI fields
            detail_res = client.get("/incidents/INC-001")
            assert detail_res.status_code == 200
            detail = detail_res.json()
            assert detail["ai_summary"] == mock_analysis["summary"]
            assert detail["ai_analysis"] is not None
            assert detail["ai_generated_at"] is not None


def test_invalid_api_key_returns_401(client):
    """Verify invalid OpenAI credentials return a clear authentication error."""
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

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = AuthenticationError(
        "Invalid API key",
        response=MagicMock(status_code=401),
        body={"error": {"message": "Incorrect API key provided"}},
    )

    with patch("backend.app.ai.engine.OpenAI", return_value=mock_client):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-invalid-key"}):
            res = client.post("/incidents/INC-001/investigate")
            assert res.status_code == 401
            assert "invalid" in res.json()["detail"].lower() or "unauthorized" in res.json()["detail"].lower()


def test_malformed_ai_response_handling(client):
    """Verify malformed JSON from model produces clean 502 error."""
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

    mock_chat_completion = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "Invalid Non-JSON response from model"
    mock_chat_completion.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = mock_chat_completion

    with patch("backend.app.ai.engine.OpenAI", return_value=mock_client):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-mock-key"}):
            res = client.post("/incidents/INC-001/investigate")
            assert res.status_code == 502
            assert "failed" in res.json()["detail"].lower()
