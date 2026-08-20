#!/usr/bin/env python3
"""Build a deterministic cleaning/review queue from canonical records.

No text is generated and no medical value is inferred. The output is a queue of
records and flags for later editorial/authoritative review.
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterator

MEDICAL_FIELDS = {"indications", "dosage", "warnings", "storage_conditions"}


def records(path: Path) -> Iterator[dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def norm_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def queue_row(record: dict[str, Any]) -> dict[str, Any]:
    flags: list[str] = []
    taxonomy = record.get("taxonomy", {})
    common = record.get("common", {})
    locales = record.get("locales", {})
    if record.get("product_kind") == "unknown":
        flags.append("product_kind_unknown")
    if taxonomy.get("state") != "classified" or not taxonomy.get("primary_taxonomy_id"):
        flags.append("taxonomy_unresolved")
    if not common.get("brand"):
        flags.append("brand_missing")
    if not common.get("manufacturer"):
        flags.append("manufacturer_missing")
    locale_flags: dict[str, list[str]] = {}
    all_descriptions: list[str] = []
    for locale, payload in locales.items():
        locale_issues: list[str] = []
        if not payload.get("slug"):
            locale_issues.append("slug_missing")
        if payload.get("translation_status") != "approved":
            locale_issues.append("translation_not_approved")
        content = payload.get("content", {})
        description = norm_text(content.get("description") or "")
        if not description:
            locale_issues.append("description_missing")
        all_descriptions.append(description)
        for field in MEDICAL_FIELDS:
            value = content.get(field)
            if value:
                locale_issues.append(f"medical_field_requires_authoritative_review:{field}")
        if locale_issues:
            locale_flags[locale] = locale_issues
    if len(all_descriptions) >= 2 and all_descriptions[0] and all_descriptions[0] in all_descriptions[1:]:
        flags.append("cross_locale_description_duplicate")
    if locale_flags:
        flags.append("locale_review_required")
    return {
        "record_id": record["id"],
        "source_record_id": record.get("source", {}).get("source_record_id"),
        "product_kind": record.get("product_kind"),
        "taxonomy_state": taxonomy.get("state"),
        "flags": sorted(set(flags)),
        "locale_flags": locale_flags,
        "action": "review_required" if flags else "deterministic_checks_passed",
        "publication_eligible": False,
        "medical_publish_approved": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--queue", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    count = 0
    action_counts: Counter[str] = Counter()
    flag_counts: Counter[str] = Counter()
    queued = 0
    with args.queue.open("w", encoding="utf-8") as output:
        for record in records(args.input):
            count += 1
            row = queue_row(record)
            action_counts[row["action"]] += 1
            for flag in row["flags"]:
                flag_counts[flag] += 1
            if row["action"] == "review_required":
                queued += 1
                output.write(json.dumps(row, ensure_ascii=False) + "\n")
    report = {
        "source_record_count": count,
        "review_queue_count": queued,
        "action_counts": dict(action_counts),
        "flag_counts": dict(flag_counts),
        "generated_text_changes": 0,
        "publication_changes": 0,
        "medical_publish_approved_count": 0,
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
