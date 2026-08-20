#!/usr/bin/env python3
"""Summarize a release builder dry-run without changing release artifacts."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    eligible = payload.get("eligible_record_counts", {})
    reasons = payload.get("blocked_reason_counts", {})
    summary = {
        "release_id": payload.get("release_id"),
        "dry_run": payload.get("dry_run"),
        "records_examined": payload.get("records_examined"),
        "eligible_record_counts": eligible,
        "eligible_total": sum(eligible.values()) if isinstance(eligible, dict) else 0,
        "blocked_reason_counts": reasons,
        "public_artifacts_written": False,
        "latest_pointer_changed": False,
        "release_gate": "blocked_until_governance_and_locale_readiness",
    }
    args.output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
