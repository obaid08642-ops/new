#!/usr/bin/env python3
"""Enforce non-negotiable external-verification flags on calibration outputs."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

SENSITIVE = {"active_ingredient", "generic_name", "indications", "dosage", "warnings"}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    rows = [json.loads(line) for line in args.input.read_text(encoding="utf-8").splitlines() if line.strip()]
    corrected: list[dict] = []
    affected: list[dict] = []
    for row in rows:
        changed_indexes: list[int] = []
        for index, decision in enumerate(row["result"]["field_decisions"]):
            if decision["field"] in SENSITIVE and decision["candidate_value"] and not decision["requires_external_verification"]:
                decision["requires_external_verification"] = True
                changed_indexes.append(index)
        if changed_indexes:
            affected.append({"record_id": row["record_id"], "decision_indexes": changed_indexes})
        corrected.append(row)
    args.output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in corrected), encoding="utf-8")
    report = {"rows_processed": len(rows), "rows_with_forced_verification": len(affected), "affected": affected}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
