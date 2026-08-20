#!/usr/bin/env python3
"""Identify which strict JSON Schema construct the proxy rejects."""
from __future__ import annotations

import json
from openai import OpenAI

client = OpenAI()
variants = {
    "base": {
        "type": "object", "properties": {"value": {"type": "string"}},
        "required": ["value"], "additionalProperties": False
    },
    "nullable": {
        "type": "object", "properties": {"value": {"type": ["string", "null"]}},
        "required": ["value"], "additionalProperties": False
    },
    "anyof_nullable": {
        "type": "object", "properties": {"value": {"anyOf": [{"type": "string"}, {"type": "null"}]}},
        "required": ["value"], "additionalProperties": False
    },
    "nested_array": {
        "type": "object", "properties": {"items": {"type": "array", "items": {
            "type": "object", "properties": {"code": {"enum": ["a", "b"]}, "detail": {"type": "string"}},
            "required": ["code", "detail"], "additionalProperties": False
        }}}, "required": ["items"], "additionalProperties": False
    },
    "all_features": {
        "type": "object", "properties": {
            "record_id": {"type": "string"},
            "candidate": {"type": ["string", "null"]},
            "items": {"type": "array", "items": {"type": "object", "properties": {
                "field": {"enum": ["x", "y"]}, "value": {"type": ["string", "null"]}, "needs": {"type": "boolean"}
            }, "required": ["field", "value", "needs"], "additionalProperties": False}}
        }, "required": ["record_id", "candidate", "items"], "additionalProperties": False
    }
}
results = {}
for name, schema in variants.items():
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": "Return any valid JSON for this schema."}],
        response_format={"type": "json_schema", "json_schema": {"name": f"variant_{name}", "strict": True, "schema": schema}},
        max_completion_tokens=500,
    )
    results[name] = json.loads(response.model_dump_json())
print(json.dumps(results, ensure_ascii=False, indent=2))
