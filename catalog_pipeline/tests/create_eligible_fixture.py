#!/usr/bin/env python3
"""Create an isolated test-only approved fixture from one canonical source record.

This file does not alter the source catalog or production eligibility. It exists
solely to exercise signed non-empty shard generation in tests.
"""
from __future__ import annotations

import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/internal/canonical_records.jsonl.gz"
OUTPUT = ROOT / "tests/eligible_fixture.jsonl.gz"


def main() -> None:
    with gzip.open(INPUT, "rt", encoding="utf-8") as source:
        record = json.loads(next(line for line in source if line.strip()))
    record["product_kind"] = "medicine"
    record["taxonomy"] = {
        "primary_taxonomy_id": "medicines.test-category",
        "secondary_taxonomy_ids": [],
        "state": "approved",
    }
    record["governance"] = {
        "public_eligibility": True,
        "approval_state": "approved_for_display",
        "indexing_eligibility": True,
        "medical_claims_status": "verified",
    }
    for locale_id in ("ar-SA", "en"):
        record["locales"][locale_id]["translation_status"] = "ready_for_export"
        record["locales"][locale_id]["slug"] = f"test-{locale_id.lower()}-{record['id']}"
    with gzip.open(OUTPUT, "wt", encoding="utf-8", compresslevel=9) as target:
        target.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Created isolated test fixture for record {record['id']}: {OUTPUT}")


if __name__ == "__main__":
    main()
