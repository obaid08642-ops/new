#!/usr/bin/env python3
"""Validate paired calibration extraction/review outputs without changing catalog state."""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SENSITIVE = {"active_ingredient", "generic_name", "indications", "dosage", "warnings"}


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, required=True)
    parser.add_argument("--extractions", type=Path, required=True)
    parser.add_argument("--reviews", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    sample_ids = {str(row["raw"]["id"]) for row in load_jsonl(args.sample)}
    extraction_rows = load_jsonl(args.extractions)
    review_rows = load_jsonl(args.reviews)
    extractions = {row["record_id"]: row for row in extraction_rows}
    reviews = {row["record_id"]: row for row in review_rows}
    errors: list[str] = []
    if len(extractions) != len(extraction_rows):
        errors.append("Duplicate extraction record_id")
    if len(reviews) != len(review_rows):
        errors.append("Duplicate review record_id")
    if set(extractions) != set(reviews):
        errors.append("Extraction/review record sets differ")

    medical_unprotected: list[dict] = []
    invalid_review_indexes: list[dict] = []
    for record_id, extraction_row in extractions.items():
        decisions = extraction_row["result"]["field_decisions"]
        for index, decision in enumerate(decisions):
            if decision["field"] in SENSITIVE and decision["candidate_value"] and not decision["requires_external_verification"]:
                medical_unprotected.append({"record_id": record_id, "index": index, "field": decision["field"]})
        review = reviews.get(record_id, {}).get("result", {})
        for index in review.get("supported_decision_indexes", []):
            if index >= len(decisions):
                invalid_review_indexes.append({"record_id": record_id, "index": index, "decision_count": len(decisions)})
    if medical_unprotected:
        errors.append("Sensitive medical candidates missing external-verification flag")
    if invalid_review_indexes:
        errors.append("Reviewer references missing extraction decision indexes")

    report = {
        "sample_count": len(sample_ids),
        "paired_results_count": len(extractions),
        "missing_result_ids": sorted(sample_ids - set(extractions)),
        "unexpected_result_ids": sorted(set(extractions) - sample_ids),
        "review_status_counts": dict(Counter(row["result"]["review_status"] for row in review_rows)),
        "medical_unprotected": medical_unprotected,
        "invalid_review_indexes": invalid_review_indexes,
        "errors": errors,
        "publication_changes": 0,
        "passed_for_completed_pairs": not errors,
        "full_sample_complete": len(extractions) == len(sample_ids),
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
