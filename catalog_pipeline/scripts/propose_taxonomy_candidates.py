#!/usr/bin/env python3
"""Propose taxonomy candidates from legacy categories without publishing or mutating records."""
from __future__ import annotations

import argparse
import gzip
import json
from collections import Counter
from pathlib import Path
from typing import Any

DIRECT_MAP = {
    "العناية بالبشرة": ("skin-care", "non_medicine", "high"),
    "العناية بالشعر": ("hair-care", "non_medicine", "high"),
    "المكياج والتجميل": ("makeup-cosmetics", "non_medicine", "high"),
    "تجميل وعناية": ("bath-body-fragrance", "non_medicine", "medium"),
    "العناية الشخصية": ("personal-care-hygiene", "non_medicine", "high"),
    "الأم والطفل": ("mother-baby", "unknown", "medium"),
    "الأجهزة الطبية": ("medical-devices", "non_medicine", "high"),
    "العروض": (None, "unknown", "high"),
    "أدوية ومكملات": (None, "unknown", "low"),
}


def load_records(path: Path) -> list[dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    if isinstance(payload, dict) and isinstance(payload.get("records"), list):
        return payload["records"]
    if isinstance(payload, dict) and isinstance(payload.get("medicines"), list):
        return payload["medicines"]
    if isinstance(payload, list):
        return payload
    raise ValueError("Unsupported raw catalog shape")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    output_rows: list[dict[str, Any]] = []
    category_counts: Counter[str] = Counter()
    candidate_counts: Counter[str] = Counter()
    for raw in load_records(args.input):
        record_id = str(raw.get("id", ""))
        legacy = raw.get("main_category") or raw.get("category") or ""
        category_counts[legacy] += 1
        category_id, product_kind, confidence = DIRECT_MAP.get(legacy, (None, "unknown", "low"))
        if legacy == "أدوية ومكملات":
            action = "split_medicines_and_supplements_review_required"
        elif legacy == "العروض":
            action = "reject_offer_from_taxonomy"
        elif category_id is None:
            action = "unmapped_review_required"
        else:
            action = "candidate_only_review_required"
        candidate_counts[category_id or "unresolved"] += 1
        output_rows.append({
            "record_id": record_id,
            "legacy_main_category": legacy,
            "candidate_primary_taxonomy_id": category_id,
            "candidate_product_kind": product_kind,
            "confidence": confidence,
            "action": action,
            "publication_eligible": False,
            "approval_status": "review_required",
            "indexing_eligibility": False,
        })
    args.output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in output_rows), encoding="utf-8")
    report = {
        "source_record_count": len(output_rows),
        "legacy_category_counts": dict(category_counts),
        "candidate_taxonomy_counts": dict(candidate_counts),
        "all_candidates_review_required": True,
        "publication_changes": 0,
        "medical_publish_approved_count": 0,
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
