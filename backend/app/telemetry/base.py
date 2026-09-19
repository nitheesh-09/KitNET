from abc import ABC, abstractmethod
from typing import Any, List, Dict
from ..schemas.event import EventCreate


class BaseTelemetryAdapter(ABC):
    """
    Abstract base interface for telemetry adapters.
    Normalizes diverse event sources (JSON files, network sensors, Docker telemetry, syslog)
    into standardized EventCreate schemas consumed by the FastAPI ingestion pipeline.
    """

    @abstractmethod
    def normalize_event(self, raw_data: Dict[str, Any]) -> EventCreate:
        """Normalize a single raw telemetry payload into an EventCreate object."""
        pass

    @abstractmethod
    def load_events(self, source: Any) -> List[EventCreate]:
        """Load and normalize a batch of events from the specified source."""
        pass
