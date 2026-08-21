#!/usr/bin/env python3
"""Validate evidence annotations without accepting medical or SEO publication."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/internal/review_batch_01.jsonl"
OUTPUT = ROOT / "data/internal/review_batch_01_evidence_annotated.jsonl"


def main() -> None:
    raw = [json.loads(line) for line in INPUT.read_text(encoding="utf-8").splitlines() if line.strip()]
    annotated = [json.loads(line) for line in OUTPUT.read_text(encoding="utf-8").splitlines() if line.strip()]
    errors = []
    if len(raw) != len(annotated):
        errors.append("record count changed")
    for before, after in zip(raw, annotated):
        if before.get("record_id") != after.get("record_id"):
            errors.append(f"record order/id changed: {before.get('record_id')}")
        copy_after = dict(after)
        copy_after.pop("evidence_annotations", None)
        if copy_after != before:
            errors.append(f"raw record changed: {before.get('record_id')}")
        ann = after.get("evidence_annotations", {})
        for flag in ("publication_eligible", "medical_publish_approved", "indexing_eligibility"):
            if ann.get(flag) is not False:
                errors.append(f"open publication flag: {before.get('record_id')}:{flag}")
        if ann.get("raw_record_unchanged") is not True:
            errors.append(f"raw_record_unchanged missing: {before.get('record_id')}")
    report = {"input_count": len(raw), "output_count": len(annotated), "errors": errors, "passed": not errors}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
