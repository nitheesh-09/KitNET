# CYBERNET Security Event Ingestion Backend (Phase 2A)

FastAPI ingestion microservice and SQLite storage for enterprise cybersecurity telemetry.

## Architecture

```
JSON Event
    ↓
FastAPI (/events)
    ↓
Pydantic Validation
    ↓
SQLAlchemy ORM
    ↓
SQLite (backend/events.db)
    ↓
JSON Response
```

## Supported Event Types

- `login_failed`
- `login_success`
- `port_scan`
- `privilege_escalation`
- `database_access`
- `file_access`
- `large_data_transfer`
- `suspicious_http_request`
- `unusual_connection`

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service & SQLite database connectivity check |
| `POST` | `/events` | Ingest and validate a security event record |
| `GET` | `/events` | List events with pagination (`limit`, `offset`) |
| `GET` | `/events/{id}` | Retrieve details of a specific event |
| `GET` | `/docs` | Interactive Swagger UI API documentation |

## Setup & Running

```bash
# 1. Install dependencies
python -m pip install -r backend/requirements.txt

# 2. Run automated tests
python -m pytest backend/tests -v

# 3. Start development server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
