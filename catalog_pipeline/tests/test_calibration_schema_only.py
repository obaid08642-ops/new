#!/usr/bin/env python3
"""Test the exact extraction schema with a minimal calibration-shaped input."""
from __future__ import annotations

import importlib.util
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("calibration_module", ROOT / "scripts/run_calibration_ai.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load calibration module")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[{"role": "user", "content": "Return a valid calibration extraction for record 1 with no evidence."}],
    response_format={"type": "json_schema", "json_schema": MODULE.EXTRACTION_SCHEMA},
    max_completion_tokens=2200,
)
print(response.model_dump_json(indent=2))
