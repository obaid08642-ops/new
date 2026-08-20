#!/usr/bin/env python3
"""Minimal structured-output request used only to diagnose proxy request shape."""
from __future__ import annotations

import json
from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-5-mini",
    messages=[{"role": "user", "content": "Return exactly an object where value is 1."}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "minimal_object",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {"value": {"type": "integer"}},
                "required": ["value"],
                "additionalProperties": False
            }
        }
    },
    max_completion_tokens=100,
)
print(response.model_dump_json(indent=2))
