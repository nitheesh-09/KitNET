import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Database path in backend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "events.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema_migrations(target_engine):
    """Safely apply schema migrations to SQLite database for existing tables."""
    with target_engine.connect() as conn:
        # Check if incidents table exists
        check = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='incidents'")).fetchone()
        if check:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(incidents)")).fetchall()]
            if "risk_score" not in cols:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN risk_score INTEGER"))
            if "severity" not in cols:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN severity VARCHAR(32)"))
            if "risk_breakdown" not in cols:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN risk_breakdown JSON"))
            if "ai_summary" not in cols:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN ai_summary TEXT"))
            if "ai_analysis" not in cols:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN ai_analysis JSON"))
            if "ai_generated_at" not in cols:
                conn.execute(text("ALTER TABLE incidents ADD COLUMN ai_generated_at DATETIME"))
            conn.commit()
