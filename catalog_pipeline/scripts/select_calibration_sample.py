#!/usr/bin/env python3
"""Select a deterministic, diverse raw-record sample for AR/EN calibration."""
from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/raw/medicines_6lang_21013.json.gz"
OUTPUT = ROOT / "data/internal/calibration_sample_ar_en.jsonl"
REPORT = ROOT / "data/internal/calibration_sample_report.json"


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def long_content(row: dict[str, Any]) -> int:
    return sum(len(text(row.get(field))) for field in ("description_ar", "description_en", "more_info_ar", "more_info_en"))


def selected_view(row: dict[str, Any], reason: str) -> dict[str, Any]:
    fields = [
        "id", "name_ar", "name_en", "category", "sub_category", "sub_sub_category",
        "brand", "manufacturer", "requires_prescription", "active_ingredient", "generic_name",
        "form", "strength", "package_size", "description_ar", "description_en", "more_info_ar",
        "more_info_en", "indications_ar", "indications_en", "dosage_ar", "dosage_en",
        "usage_instructions_ar", "usage_instructions_en", "warnings_ar", "warnings_en",
        "precautions_ar", "precautions_en", "storage_conditions_ar", "storage_conditions_en",
        "image", "image_1", "image_2", "image_3", "image_4", "image_5", "drugs_com_link", "sfda_link"
    ]
    return {"sampling_reason": reason, "raw": {field: row.get(field) for field in fields}}


def first_matching(rows: list[dict[str, Any]], predicate: Callable[[dict[str, Any]], bool], limit: int, reason: str, chosen: dict[str, dict[str, Any]]) -> None:
    for row in rows:
        row_id = str(row.get("id") or "")
        if len([entry for entry in chosen.values() if entry["sampling_reason"] == reason]) >= limit:
            return
        if row_id and row_id not in chosen and predicate(row):
            chosen[row_id] = selected_view(row, reason)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=INPUT)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()

    with gzip.open(args.input, "rt", encoding="utf-8") as source:
        rows = json.load(source)["medicines"]
    rows = sorted((row for row in rows if isinstance(row, dict)), key=lambda row: int(str(row.get("id") or "0")) if str(row.get("id") or "").isdigit() else 10**18)
    chosen: dict[str, dict[str, Any]] = {}
    categories = sorted({text(row.get("category")) for row in rows if text(row.get("category"))})
    for category in categories:
        first_matching(rows, lambda row, c=category: text(row.get("category")) == c, 3, f"category:{category}", chosen)

    first_matching(rows, lambda row: row.get("requires_prescription") is True, 8, "prescription", chosen)
    first_matching(rows, lambda row: bool(text(row.get("active_ingredient"))) and bool(text(row.get("generic_name"))), 8, "ingredient_and_generic", chosen)
    first_matching(rows, lambda row: bool(text(row.get("brand"))) and bool(text(row.get("manufacturer"))) and text(row.get("brand")) != text(row.get("manufacturer")), 8, "brand_manufacturer_distinct", chosen)
    first_matching(rows, lambda row: long_content(row) >= 12000, 6, "long_content", chosen)
    first_matching(rows, lambda row: not any(text(row.get(f"image_{idx}")) for idx in range(1, 6)) and not text(row.get("image")), 2, "no_image", chosen)
    first_matching(rows, lambda row: not text(row.get("sub_category")) or not text(row.get("sub_sub_category")), 6, "incomplete_legacy_taxonomy", chosen)

    entries = list(chosen.values())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as target:
        for entry in entries:
            target.write(json.dumps(entry, ensure_ascii=False) + "\n")
    reason_counts: dict[str, int] = {}
    for entry in entries:
        reason_counts[entry["sampling_reason"]] = reason_counts.get(entry["sampling_reason"], 0) + 1
    report = {"source_record_count": len(rows), "sample_count": len(entries), "sampling_reason_counts": reason_counts, "categories_covered": categories}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
