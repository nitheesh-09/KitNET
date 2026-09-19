from . import config  # noqa: F401 — load .env before other modules read environment
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, ensure_schema_migrations
from . import models  # Ensures Event and Detection models register with Base
from .routes.events import router as events_router
from .routes.detections import router as detections_router
from .routes.incidents import router as incidents_router
from .routes.investigation import router as investigation_router
from .routes.response import router as response_router
from .routes.feedback import router as feedback_router
from .routes.system import router as system_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager creating SQLite tables and running schema migrations."""
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations(engine)
    yield


app = FastAPI(
    title="CYBERNET Security Ingestion API",
    description="FastAPI event ingestion service and SQLite storage for enterprise security telemetry.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration restricted to local frontend development origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(events_router)
app.include_router(detections_router)
app.include_router(incidents_router)
app.include_router(investigation_router)
app.include_router(response_router)
app.include_router(feedback_router)
app.include_router(system_router)


@app.get("/", tags=["Root"])
def root():
    return {
        "service": "CYBERNET Security Ingestion Engine",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
    }
