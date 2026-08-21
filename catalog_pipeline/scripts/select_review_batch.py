#!/usr/bin/env python3
"""Select a deterministic, representative review batch without changing source records."""
from __future__ import annotations

import argparse
import gzip
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

TARGETS = {
    "category": 2,
    "offers": 2,
    "medicines_and_supplements": 4,
    "mother_baby": 2,
    "medical_devices": 2,
    "missing_brand_or_manufacturer": 2,
    "long_content": 2,
    "slug_collision_candidate": 2,
}


def load_raw(path: Path) -> dict[str, dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    records = payload.get("medicines", payload.get("records", []))
    return {str(row.get("id")): row for row in records}


def load_jsonl(path: Path) -> dict[str, dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                row = json.loads(line)
                rows[str(row.get("record_id", row.get("id", "")))] = row
    return rows


def reasons(raw: dict[str, Any], queue: dict[str, Any], taxonomy: dict[str, Any], slug: dict[str, Any]) -> list[str]:
    category = str(raw.get("category") or raw.get("main_category") or "")
    result: list[str] = []
    if category == "العروض":
        result.append("offers")
    if category == "أدوية ومكملات":
        result.append("medicines_and_supplements")
    if category == "الأم والطفل":
        result.append("mother_baby")
    if category == "الأجهزة الطبية":
        result.append("medical_devices")
    if category not in {"العروض", "أدوية ومكملات", "الأم والطفل", "الأجهزة الطبية"}:
        result.append("category")
    flags = set(queue.get("flags", []))
    if "brand_missing" in flags or "manufacturer_missing" in flags:
        result.append("missing_brand_or_manufacturer")
    names = [str(raw.get("name_ar") or ""), str(raw.get("name_en") or "")]
    descriptions = [str(raw.get(key) or "") for key in ("description_ar", "description_en", "more_info_ar", "more_info_en")]
    if max([len(x) for x in names + descriptions] or [0]) >= 1000:
        result.append("long_content")
    if any(p.get("status") == "review_required" and p.get("slug_candidate", "").endswith(str(raw.get("id"))) for p in slug.get("locales", {}).values()):
        result.append("slug_collision_candidate")
    return result or ["general_review"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, required=True)
    parser.add_argument("--queue", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path, required=True)
    parser.add_argument("--slug", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    raw = load_raw(args.raw)
    queue = load_jsonl(args.queue)
    taxonomy = load_jsonl(args.taxonomy)
    slug = load_jsonl(args.slug)
    selected: list[dict[str, Any]] = []
    counts: dict[str, int] = defaultdict(int)
    chosen: set[str] = set()
    for record_id in sorted(raw):
        row_reasons = reasons(raw[record_id], queue.get(record_id, {}), taxonomy.get(record_id, {}), slug.get(record_id, {}))
        eligible_reasons = [r for r in row_reasons if counts[r] < TARGETS.get(r, 0)]
        if not eligible_reasons or record_id in chosen:
            continue
        chosen.add(record_id)
        for reason in eligible_reasons:
            counts[reason] += 1
        selected.append({
            "record_id": record_id,
            "reasons": eligible_reasons,
            "raw": raw[record_id],
            "cleaning_queue": queue.get(record_id),
            "taxonomy_candidate": taxonomy.get(record_id),
            "slug_candidate": slug.get(record_id),
            "review_status": "pending_review",
            "publication_eligible": False,
            "medical_publish_approved": False,
            "indexing_eligibility": False,
        })
    args.output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in selected), encoding="utf-8")
    report = {
        "selected_count": len(selected),
        "reason_counts": dict(counts),
        "target_counts": TARGETS,
        "all_records_pending_review": all(row["review_status"] == "pending_review" for row in selected),
        "publication_eligible_count": 0,
        "medical_publish_approved_count": 0,
        "indexing_eligible_count": 0,
        "record_ids": [row["record_id"] for row in selected],
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
