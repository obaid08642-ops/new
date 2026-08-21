#!/usr/bin/env python3
"""Inspect a review batch and classify evidence conflicts without editing records."""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    rows = [json.loads(line) for line in args.input.read_text(encoding="utf-8").splitlines() if line.strip()]
    summary: list[dict[str, Any]] = []
    conflict_counts: Counter[str] = Counter()
    for row in rows:
        raw = row["raw"]
        translations = raw.get("translations", {})
        names = {"ar-SA": raw.get("name_ar"), "en": raw.get("name_en")}
        for locale in ("ur", "hi", "bn", "fil"):
            names[locale] = (translations.get(locale) or {}).get("name")
        nonempty_names = {k: v for k, v in names.items() if v}
        category = raw.get("category") or raw.get("main_category")
        medical_fields = {key: raw.get(key) for key in ("active_ingredient", "dosage_form", "strength", "indications_uses", "dosage_instructions", "side_effects", "warnings_precautions", "storage_conditions", "requires_prescription", "sfda_link", "drugs_com_link") if raw.get(key) not in (None, "")}
        conflicts: list[str] = []
        if category == "أدوية ومكملات":
            conflicts.append("medicine_vs_supplement_unresolved")
        if category in {"الأم والطفل", "الأجهزة الطبية"}:
            conflicts.append("sensitive_category_requires_review")
        if raw.get("name_ar") and raw.get("name_en") and raw.get("name_ar") == raw.get("name_en"):
            conflicts.append("ar_en_name_identical")
        if not raw.get("brand") or not raw.get("manufacturer"):
            conflicts.append("identity_metadata_missing")
        if any(v for v in medical_fields.values()):
            conflicts.append("medical_claims_or_fields_present")
        for conflict in conflicts:
            conflict_counts[conflict] += 1
        summary.append({
            "record_id": row["record_id"],
            "category": category,
            "sub_category": raw.get("sub_category"),
            "names_present": sorted(nonempty_names),
            "medical_fields_present": sorted(medical_fields),
            "conflicts": conflicts,
            "candidate_taxonomy_id": (row.get("taxonomy_candidate") or {}).get("candidate_primary_taxonomy_id"),
            "candidate_product_kind": (row.get("taxonomy_candidate") or {}).get("candidate_product_kind"),
            "review_status": "pending_review",
            "publication_eligible": False,
            "medical_publish_approved": False,
            "indexing_eligibility": False,
        })
    report = {
        "record_count": len(summary),
        "conflict_counts": dict(conflict_counts),
        "medical_publish_approved_count": 0,
        "publication_eligible_count": 0,
        "indexing_eligible_count": 0,
        "records": summary,
    }
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
