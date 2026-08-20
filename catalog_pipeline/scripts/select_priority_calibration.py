#!/usr/bin/env python3
"""Create a compact, representative calibration subset from the 65-record sample."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/internal/calibration_sample_ar_en.jsonl"
OUTPUT = ROOT / "data/internal/calibration_priority_ar_en.jsonl"
REPORT = ROOT / "data/internal/calibration_priority_report.json"

LIMITS = {
    "prescription": 2,
    "ingredient_and_generic": 2,
    "brand_manufacturer_distinct": 2,
    "long_content": 2,
    "no_image": 2,
    "incomplete_legacy_taxonomy": 2,
}


def limit_for_reason(reason: str) -> int:
    return 1 if reason.startswith("category:") else LIMITS.get(reason, 0)


def main() -> None:
    rows = [json.loads(line) for line in INPUT.read_text(encoding="utf-8").splitlines() if line.strip()]
    selected: list[dict] = []
    selected_ids: set[str] = set()
    counts: dict[str, int] = {}
    for row in rows:
        reason = row["sampling_reason"]
        record_id = str(row["raw"]["id"])
        if counts.get(reason, 0) >= limit_for_reason(reason) or record_id in selected_ids:
            continue
        selected.append(row)
        selected_ids.add(record_id)
        counts[reason] = counts.get(reason, 0) + 1
    OUTPUT.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in selected), encoding="utf-8")
    report = {
        "priority_sample_count": len(selected),
        "sampling_reason_counts": counts,
        "categories_covered": sorted(reason.removeprefix("category:") for reason in counts if reason.startswith("category:")),
        "record_ids": [row["raw"]["id"] for row in selected],
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
