#!/usr/bin/env python3
"""Validate review-only localized slug candidates."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

EXPECTED_LOCALES = {"ar-SA", "en", "ur", "hi", "bn", "fil"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    count = 0
    errors: list[dict] = []
    for line in args.input.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        count += 1
        locales = set(row.get("locales", {}))
        if locales != EXPECTED_LOCALES:
            errors.append({"record_id": row.get("record_id"), "error": "locale_set_mismatch", "locales": sorted(locales)})
        if row.get("publication_eligible") is not False or row.get("indexing_eligibility") is not False:
            errors.append({"record_id": row.get("record_id"), "error": "eligibility_not_false"})
        for locale, payload in row.get("locales", {}).items():
            if not payload.get("slug_candidate"):
                errors.append({"record_id": row.get("record_id"), "locale": locale, "error": "empty_slug_candidate"})
            if payload.get("status") != "review_required":
                errors.append({"record_id": row.get("record_id"), "locale": locale, "error": "status_not_review_required"})
    report = {"record_count": count, "error_count": len(errors), "errors_sample": errors[:20], "passed": not errors, "publication_changes": 0}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
