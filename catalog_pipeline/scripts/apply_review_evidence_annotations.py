#!/usr/bin/env python3
"""Add evidence-only annotations to review batch 01 without changing raw records."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data/internal/review_batch_01.jsonl"
OUTPUT = ROOT / "data/internal/review_batch_01_evidence_annotated.jsonl"
REPORT = ROOT / "data/internal/review_batch_01_evidence_report.json"

API_REVIEWED = {"100002", "100004", "100006", "100078"}
SERVICES = {
    "1000228": "altibbi_consultation_normal",
    "1000229": "altibbi_consultation_glp",
}
PROMOTION_REVIEWED = {"100434", "101830"}


def main() -> None:
    rows = []
    counts = {"total": 0, "api_identity_evidence": 0, "service_candidate": 0, "promotion_separated": 0, "pending_medical": 0}
    with INPUT.open(encoding="utf-8") as src, OUTPUT.open("w", encoding="utf-8") as dst:
        for line in src:
            row = json.loads(line)
            rid = str(row["record_id"])
            ann = {
                "evidence_annotation_version": "1.0",
                "identity_evidence": "api_ar_en" if rid in API_REVIEWED or rid in SERVICES or rid in PROMOTION_REVIEWED else "local_raw_only",
                "taxonomy_decision": "service_candidate" if rid in SERVICES else ("reclassify_product_separate_from_promotion" if rid in PROMOTION_REVIEWED else "pending_review"),
                "medical_review_state": "medical_review_required" if rid in API_REVIEWED or rid == "100078" else "not_applicable_or_unverified",
                "publication_eligible": False,
                "medical_publish_approved": False,
                "indexing_eligibility": False,
                "raw_record_unchanged": True,
            }
            row["evidence_annotations"] = ann
            dst.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            counts["total"] += 1
            if ann["identity_evidence"] == "api_ar_en": counts["api_identity_evidence"] += 1
            if rid in SERVICES: counts["service_candidate"] += 1
            if rid in PROMOTION_REVIEWED: counts["promotion_separated"] += 1
            if ann["medical_review_state"] == "medical_review_required": counts["pending_medical"] += 1
    report = {**counts, "all_publication_flags_false": True, "source": str(INPUT), "output": str(OUTPUT)}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
