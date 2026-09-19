"""
Backend environment configuration.
Loads variables from backend/.env and project-root .env (if present).
Existing process environment variables are never overridden.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(PROJECT_ROOT / ".env")


def get_openai_api_key() -> str | None:
    """Return configured OpenAI API key, or None if unset/blank."""
    value = os.getenv("OPENAI_API_KEY")
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def get_openai_model() -> str:
    """Return configured OpenAI model name."""
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")
