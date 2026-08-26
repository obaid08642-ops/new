#!/usr/bin/env python3
"""Apply only the manually reviewed Patient Web Auth/Privacy dispositions to the parity TSV."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TSV = ROOT / "audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv"
WEB = ROOT / "audit-work/source/nabd-patient-web"
EVIDENCE = "audit-artifacts/gap-closure-audit/patient-web-manual-evidence/AUTH_SESSION_PRIVACY_FAMILY_MANUAL_REVIEW_2026-08-26.md"


def file_hash(relative_path: str) -> str:
    return hashlib.sha256((WEB / relative_path).read_bytes()).hexdigest()


def line_count(relative_path: str) -> str:
    return str(len((WEB / relative_path).read_text(encoding="utf-8").splitlines()))


def mapped(
    source: str,
    route: str,
    action_lines: str,
    mapping_status: str,
    note: str,
    cta: str,
    scenario: str,
    contract: str,
) -> dict[str, str]:
    return {
        "web_source_path": source,
        "web_route_candidate": route,
        "web_sha256": file_hash(source),
        "web_line_count": line_count(source),
        "web_action_signal_lines": action_lines,
        "mapping_status": mapping_status,
        "mapping_note": f"{note} Evidence: {EVIDENCE}",
        "visual_parity_status": "NOT_REVIEWED__SOURCE_ONLY",
        "cta_parity_status": cta,
        "scenario_parity_status": scenario,
        "contract_parity_status": contract,
        "approved_exception_reason": "NONE",
    }


def absent(classification: str, note: str) -> dict[str, str]:
    return {
        "web_source_path": "NONE__SOURCE_TREE_SCAN",
        "web_route_candidate": "NONE",
        "web_sha256": "NONE",
        "web_line_count": "0",
        "web_action_signal_lines": "NONE",
        "mapping_status": f"MANUAL_MAPPING_COMPLETE__{classification}",
        "mapping_note": f"{note} Evidence: {EVIDENCE}",
        "visual_parity_status": "NOT_REVIEWED__SOURCE_ONLY",
        "cta_parity_status": classification,
        "scenario_parity_status": classification,
        "contract_parity_status": "INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE",
        "approved_exception_reason": "NONE",
    }

UPDATES: dict[str, dict[str, str]] = {
    "PM-001": absent("MISSING_CAPABILITY", "No localized forgot-password page or password-recovery handler found in reviewed Web source tree."),
    "PM-002": mapped("components-next/login-form.tsx", "/{locale}/login", "16-53", "MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL", "Login form provides password, OTP and 2FA client paths; visual parity and upstream contract remain unproven.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "RUNTIME_REQUIRED"),
    "PM-003": mapped("components-next/login-form.tsx", "/{locale}/login", "19-29, 41-52", "MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL", "OTP is an in-form state, not a separately evidenced query route; one-time exchange/cookie behavior requires Backend/runtime reconciliation.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "RUNTIME_REQUIRED"),
    "PM-004": mapped("app/[locale]/settings/page.tsx", "/{locale}/settings", "17-44", "MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY", "Settings provides read-only privacy/security summaries; no consent or privacy-management mutation CTA is evidenced.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
    "PM-005": absent("INSUFFICIENT_EVIDENCE", "No patient-Web auth/provider-info equivalent was located; source absence does not prove a Backend contract is absent."),
    "PM-006": absent("MISSING_CAPABILITY", "No localized registration page or registration handler found in reviewed Web source tree."),
    "PM-007": absent("MISSING_CAPABILITY", "No localized reset-password page or reset-password handler found in reviewed Web source tree."),
    "PM-008": absent("MISSING_CAPABILITY", "No localized terms/acceptance page or handler found in reviewed Web source tree."),
    "PM-009": mapped("app/[locale]/page.tsx", "/{locale}", "10-11", "MANUAL_MAPPING_COMPLETE__STATIC_MATCHED_PARTIAL", "Public landing is a partial web welcome alternative but does not evidence native onboarding/legal/account-choice equivalence.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
}

lines = TSV.read_text(encoding="utf-8").splitlines()
header = lines[0].split("\t")
columns = {name: index for index, name in enumerate(header)}
required = set(next(iter(UPDATES.values())))
missing = sorted(required - set(columns))
if missing:
    raise SystemExit(f"Missing columns: {missing}")

seen: set[str] = set()
output = [lines[0]]
for raw in lines[1:]:
    fields = raw.split("\t")
    row_id = fields[columns["screen_id"]]
    update = UPDATES.get(row_id)
    if update:
        for key, value in update.items():
            fields[columns[key]] = value
        seen.add(row_id)
    output.append("\t".join(fields))
missing_rows = sorted(set(UPDATES) - seen)
if missing_rows:
    raise SystemExit(f"Missing target rows: {missing_rows}")
TSV.write_text("\n".join(output) + "\n", encoding="utf-8")
print("updated=" + ",".join(sorted(seen)))
