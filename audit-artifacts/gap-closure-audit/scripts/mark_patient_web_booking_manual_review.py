#!/usr/bin/env python3
"""Apply only manually reviewed Patient Web booking/diagnostics/home-care dispositions."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TSV = ROOT / "audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv"
WEB = ROOT / "audit-work/source/nabd-patient-web"
EVIDENCE = "audit-artifacts/gap-closure-audit/patient-web-manual-evidence/CONSULTATION_BOOKING_DIAGNOSTICS_HOME_CARE_MANUAL_REVIEW_2026-08-26.md"


def file_hash(path: str) -> str:
    return hashlib.sha256((WEB / path).read_bytes()).hexdigest()


def line_count(path: str) -> str:
    return str(len((WEB / path).read_text(encoding="utf-8").splitlines()))


def mapped(path: str, route: str, lines: str, state: str, note: str, cta: str, scenario: str, contract: str) -> dict[str, str]:
    return {
        "web_source_path": path,
        "web_route_candidate": route,
        "web_sha256": file_hash(path),
        "web_line_count": line_count(path),
        "web_action_signal_lines": lines,
        "mapping_status": f"MANUAL_MAPPING_COMPLETE__{state}",
        "mapping_note": f"{note} Evidence: {EVIDENCE}",
        "visual_parity_status": "NOT_REVIEWED__SOURCE_ONLY",
        "cta_parity_status": cta,
        "scenario_parity_status": scenario,
        "contract_parity_status": contract,
        "approved_exception_reason": "NONE",
    }


def absent(note: str) -> dict[str, str]:
    return {
        "web_source_path": "NONE__SOURCE_TREE_AND_MUTATION_SCAN",
        "web_route_candidate": "NONE",
        "web_sha256": "NONE",
        "web_line_count": "0",
        "web_action_signal_lines": "NONE",
        "mapping_status": "MANUAL_MAPPING_COMPLETE__MISSING_CAPABILITY",
        "mapping_note": f"{note} Evidence: {EVIDENCE}",
        "visual_parity_status": "NOT_REVIEWED__SOURCE_ONLY",
        "cta_parity_status": "MISSING_CAPABILITY",
        "scenario_parity_status": "MISSING_CAPABILITY",
        "contract_parity_status": "INSUFFICIENT_EVIDENCE__NO_WEB_SURFACE",
        "approved_exception_reason": "NONE",
    }

UPDATES: dict[str, dict[str, str]] = {
    "PM-013": mapped("app/[locale]/consultations/doctors/[doctorId]/page.tsx", "/{locale}/consultations/doctors/{doctorId}", "16-21", "STATIC_MATCHED_PARTIAL", "Public doctor/slot discovery mounts an idempotent booking form, but price/payment/insurance/provider decision are not evidenced.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "RUNTIME_REQUIRED"),
    "PM-014": mapped("app/[locale]/diagnostics/labs/page.tsx", "/{locale}/diagnostics/labs", "17-26", "MISSING_CAPABILITY", "Public labs discovery is static card/filter UI; no booking, payment, insurance, provider or result transition is evidenced.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
    "PM-017": absent("No nursing-specific Web service/profile/tracking workflow was located; home-care catalog does not evidence nursing booking/fulfillment."),
    "PM-033": mapped("app/[locale]/appointments/[appointmentId]/page.tsx", "/{locale}/appointments/{appointmentId}", "22-42", "STATIC_MATCHED_PARTIAL", "Protected appointment detail supports limited consultation actions; payment/insurance/provider ownership and lifecycle remain unresolved.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-034": mapped("app/[locale]/appointments/page.tsx", "/{locale}/appointments", "21-42", "STATIC_MATCHED_PARTIAL", "Appointment list is post-booking read surface with client status buckets; it is not consultation discovery or lifecycle authority.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-035": mapped("components-next/appointment-booking-form.tsx", "/{locale}/consultations/doctors/{doctorId}", "10-28", "STATIC_MATCHED_PARTIAL", "Booking request carries doctor/type/slot and idempotency only; cash/card-before-confirmation and insurance flow are not evidenced.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "RUNTIME_REQUIRED"),
    "PM-036": absent("No dedicated Web consultation confirmation surface or receipt/payment completion state was located; booking redirects to generic appointment detail."),
    "PM-037": absent("No dedicated Web consultation pending/insurance/payment state surface was located; generic appointment detail does not provide required decision/payment transitions."),
    "PM-038": absent("No dedicated Web consultation success/receipt surface or verified payment-confirmation state was located."),
    "PM-040": mapped("components-next/appointment-reschedule-form.tsx", "/{locale}/appointments/{appointmentId}", "10-14", "STATIC_MATCHED_PARTIAL", "Consultation-only cancel/reschedule uses local datetime input and idempotency; no authoritative slot picker, financial or payer lifecycle is evidenced.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-045": mapped("app/[locale]/consultations/doctors/[doctorId]/page.tsx", "/{locale}/consultations/doctors/{doctorId}", "16-21", "STATIC_MATCHED_PARTIAL", "Public doctor detail and slots exist; pricing/coverage/provider availability authority remains unproven.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-047": mapped("app/[locale]/consultations/doctors/[doctorId]/page.tsx", "/{locale}/consultations/doctors/{doctorId}", "16-21", "STATIC_MATCHED_PARTIAL", "Public doctor detail and slots exist; pricing/coverage/provider availability authority remains unproven.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-055": mapped("app/[locale]/consultations/specialties/page.tsx", "/{locale}/consultations/specialties", "26-32", "CONFIRMED_DEFECT", "Specialty selection links to an appointments list whose source accepts only tab and drops the specialty rather than entering doctor discovery.", "CONFIRMED_DEFECT", "CONFIRMED_DEFECT", "INSUFFICIENT_EVIDENCE"),
    "PM-057": mapped("components-next/call-token-launcher.tsx", "/{locale}/appointments/{appointmentId}", "9-13", "STATIC_MATCHED_PARTIAL", "Video path requests a call token and shows local ready/error only; it does not join or manage a call lifecycle.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "RUNTIME_REQUIRED"),
    "PM-062": absent("No Web diagnostic sample-booking creation surface or mutation handler was located in reviewed source."),
    "PM-063": absent("No Web diagnostic booking confirmation surface or payment/insurance completion state was located."),
    "PM-064": absent("No Web diagnostic booking success/receipt surface was located."),
    "PM-065": absent("No Web diagnostic cart surface or diagnostic-cart mutation flow was located."),
    "PM-066": absent("No Web diagnostic checkout/payment surface or mutation handler was located."),
    "PM-067": absent("No Web diagnostic insurance-approval or co-pay decision surface was located."),
    "PM-068": absent("No Web diagnostic insurance-upload surface or associated mutation was located."),
    "PM-070": absent("Lab discovery cards are static and no Web lab-detail/booking route was located in reviewed source."),
    "PM-072": mapped("app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx", "/{locale}/diagnostics/{domain}/{bookingId}", "15-38", "STATIC_MATCHED_PARTIAL", "Protected diagnostic booking read exists; no payment/insurance/cancel/result/provider workflow CTA is evidenced.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-075": mapped("app/[locale]/diagnostics/packages/page.tsx", "/{locale}/diagnostics/packages", "17-26", "STATIC_MATCHED_PARTIAL", "Public lab-package discovery/detail handoff exists but no booking, insurance, payment or confirmation transition is evidenced.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "INSUFFICIENT_EVIDENCE"),
    "PM-077": mapped("app/[locale]/diagnostics/[domain]/[bookingId]/page.tsx", "/{locale}/diagnostics/{domain}/{bookingId}", "15-38", "STATIC_MATCHED_PARTIAL", "Diagnostic status/schedule/location read exists; no sample/technician tracking state or communication CTA is evidenced.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "INSUFFICIENT_EVIDENCE"),
    "PM-078": mapped("app/[locale]/diagnostics/labs/page.tsx", "/{locale}/diagnostics/labs", "17-26", "MISSING_CAPABILITY", "Lab search/filter display exists but does not transition to diagnostic booking/payment/insurance flow.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
    "PM-079": absent("No Web diagnostic technician-tracking surface was located in reviewed source."),
    "PM-080": absent("No Web diagnostic test-detail/booking surface was located; labs cards have no detail link."),
    "PM-081": absent("No Web diagnostic referral/prescription upload surface or mutation was located."),
    "PM-161": absent("No Web nursing live-tracking surface was located; generic home-care catalog is not equivalent evidence."),
    "PM-162": absent("No Web nursing-profile surface was located; generic home-care catalog is not equivalent evidence."),
    "PM-163": mapped("app/[locale]/home-care/services/[serviceId]/page.tsx", "/{locale}/home-care/services/{serviceId}", "13-18", "MISSING_CAPABILITY", "Home-care service detail displays catalog facts only; no nursing booking/provider/payment/insurance handoff is evidenced.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
    "PM-164": mapped("app/[locale]/home-care/services/[serviceId]/page.tsx", "/{locale}/home-care/services/{serviceId}", "13-18", "MISSING_CAPABILITY", "Home-care service information is catalog-only; no nursing service workflow or authoritative fulfillment state is evidenced.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
}

lines = TSV.read_text(encoding="utf-8").splitlines()
header = lines[0].split("\t")
columns = {name: index for index, name in enumerate(header)}
required = set(next(iter(UPDATES.values())))
missing_columns = sorted(required - set(columns))
if missing_columns:
    raise SystemExit(f"Missing columns: {missing_columns}")
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
