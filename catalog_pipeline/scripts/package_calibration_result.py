#!/usr/bin/env python3
"""Package calibration results with explicit unprocessed records.

This is a local audit artifact. It never grants publication eligibility and never
fills missing content for a record whose model processing did not complete.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, required=True)
    parser.add_argument("--extractions", type=Path, required=True)
    parser.add_argument("--reviews", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    samples = load_jsonl(args.sample)
    extractions = {row["record_id"]: row for row in load_jsonl(args.extractions)}
    reviews = {row["record_id"]: row for row in load_jsonl(args.reviews)}
    packaged: list[dict] = []
    for sample in samples:
        record_id = str(sample["raw"]["id"])
        base = {
            "record_id": record_id,
            "sampling_reason": sample["sampling_reason"],
            "publication_eligible": False,
            "medical_publish_approved": False,
        }
        if record_id in extractions and record_id in reviews:
            base.update({
                "status": "extracted_and_independently_reviewed",
                "extraction": extractions[record_id]["result"],
                "independent_review": reviews[record_id]["result"],
            })
        else:
            base.update({
                "status": "unprocessed",
                "unprocessed_reason": "structured_processing_unavailable",
                "next_action": "retry_calibration_before_phase_gate",
            })
        packaged.append(base)

    args.output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in packaged), encoding="utf-8")
    report = {
        "sample_count": len(packaged),
        "status_counts": dict(Counter(row["status"] for row in packaged)),
        "unprocessed_record_ids": [row["record_id"] for row in packaged if row["status"] == "unprocessed"],
        "publication_eligible_count": sum(1 for row in packaged if row["publication_eligible"]),
        "medical_publish_approved_count": sum(1 for row in packaged if row["medical_publish_approved"]),
        "phase_gate": "blocked_until_unprocessed_records_are_retried",
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
