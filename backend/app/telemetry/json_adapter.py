import json
from typing import Any, List, Dict, Union
from .base import BaseTelemetryAdapter
from ..schemas.event import EventCreate, EventType


class JsonTelemetryAdapter(BaseTelemetryAdapter):
    """
    Adapter capable of reading structured JSON telemetry records,
    validating them against Pydantic EventCreate schemas, and providing
    normalized event collections.
    """

    def normalize_event(self, raw_data: Dict[str, Any]) -> EventCreate:
        """Parse and validate raw event dict into standard EventCreate."""
        # Handle string or Enum event_type mapping
        event_type_val = raw_data.get("event_type")
        if isinstance(event_type_val, str):
            event_type_val = event_type_val.lower()

        normalized = {
            "timestamp": raw_data["timestamp"],
            "source_ip": raw_data["source_ip"],
            "destination_ip": raw_data["destination_ip"],
            "username": raw_data.get("username"),
            "event_type": event_type_val,
            "protocol": raw_data.get("protocol", "TCP"),
            "service": raw_data.get("service", "AUTH"),
            "status": raw_data.get("status", "detected"),
            "metadata": raw_data.get("metadata"),
        }
        return EventCreate(**normalized)

    def load_events(self, source: Union[str, List[Dict[str, Any]]]) -> List[EventCreate]:
        """
        Load and normalize events from a JSON filepath, a JSON string, or a list of dicts.
        """
        raw_items: List[Dict[str, Any]] = []

        if isinstance(source, list):
            raw_items = source
        elif isinstance(source, str):
            # Check if source is a file path or raw JSON string
            if source.strip().startswith("[") or source.strip().startswith("{"):
                loaded = json.loads(source)
                raw_items = loaded if isinstance(loaded, list) else [loaded]
            else:
                with open(source, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    raw_items = loaded if isinstance(loaded, list) else [loaded]

        return [self.normalize_event(item) for item in raw_items]
