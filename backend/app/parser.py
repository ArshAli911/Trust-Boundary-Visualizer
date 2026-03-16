from __future__ import annotations

import json

import yaml

from .models import ArchitectureDocument


def parse_architecture(document: str, format_hint: str = "auto") -> ArchitectureDocument:
    format_hint = (format_hint or "auto").lower()
    raw = document.strip()
    if not raw:
        raise ValueError("Architecture document is empty.")

    try:
        if format_hint == "json":
            payload = json.loads(raw)
        elif format_hint == "yaml":
            payload = yaml.safe_load(raw)
        else:
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = yaml.safe_load(raw)
    except (json.JSONDecodeError, yaml.YAMLError) as exc:
        raise ValueError(f"Unable to parse architecture document: {exc}") from exc

    if not isinstance(payload, dict):
        raise ValueError("Architecture document must describe an object.")

    return ArchitectureDocument.model_validate(payload)
