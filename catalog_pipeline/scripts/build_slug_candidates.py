#!/usr/bin/env python3
"""Build deterministic, review-only slug candidates from raw localized names."""
from __future__ import annotations

import argparse
import gzip
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any

LOCALE_FIELDS = {
    "ar-SA": ("name_ar", "name"),
    "en": ("name_en", "name"),
    "ur": ("translations.ur.name",),
    "hi": ("translations.hi.name",),
    "bn": ("translations.bn.name",),
    "fil": ("translations.fil.name",),
}


def load_records(path: Path) -> list[dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload.get("medicines", payload.get("records", payload)) if isinstance(payload, dict) else payload


def nested_get(record: dict[str, Any], path: str) -> Any:
    value: Any = record
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def candidate_slug(value: str, record_id: str) -> str:
    value = unicodedata.normalize("NFKC", value).strip().lower()
    value = re.sub(r"[^\w\-]+", "-", value, flags=re.UNICODE)
    value = re.sub(r"-+", "-", value).strip("-")
    return (value[:120].rstrip("-") if value else f"product-{record_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    seen: dict[str, Counter[str]] = {locale: Counter() for locale in LOCALE_FIELDS}
    rows: list[dict[str, Any]] = []
    collision_count = 0
    for record in load_records(args.input):
        record_id = str(record.get("id", ""))
        locales: dict[str, dict[str, Any]] = {}
        for locale, fields in LOCALE_FIELDS.items():
            value = next((nested_get(record, field) for field in fields if nested_get(record, field)), "")
            base = candidate_slug(str(value), record_id)
            seen[locale][base] += 1
            if seen[locale][base] > 1:
                collision_count += 1
                candidate = f"{base}-{record_id}"
            else:
                candidate = base
            locales[locale] = {"source_name": value, "slug_candidate": candidate, "status": "review_required"}
        rows.append({"record_id": record_id, "locales": locales, "publication_eligible": False, "indexing_eligibility": False})
    args.output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")
    report = {"source_record_count": len(rows), "locale_count": len(LOCALE_FIELDS), "collision_count": collision_count, "all_candidates_review_required": True, "publication_changes": 0}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
