#!/usr/bin/env python3
"""Apply only the manually reviewed Patient Web pharmacy/order dispositions to the parity TSV."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TSV = ROOT / "audit-artifacts/gap-closure-audit/PATIENT_WEB_TO_MOBILE_PARITY_REGISTER_2026-08-26.tsv"
WEB = ROOT / "audit-work/source/nabd-patient-web"
EVIDENCE = "audit-artifacts/gap-closure-audit/patient-web-manual-evidence/PHARMACY_CART_OFFERS_PAYMENT_ORDERS_MANUAL_REVIEW_2026-08-26.md"


def file_hash(relative_path: str) -> str:
    return hashlib.sha256((WEB / relative_path).read_bytes()).hexdigest()


def line_count(relative_path: str) -> str:
    return str(len((WEB / relative_path).read_text(encoding="utf-8").splitlines()))


def mapped(source: str, route: str, lines: str, status: str, note: str, cta: str, scenario: str, contract: str) -> dict[str, str]:
    return {
        "web_source_path": source,
        "web_route_candidate": route,
        "web_sha256": file_hash(source),
        "web_line_count": line_count(source),
        "web_action_signal_lines": lines,
        "mapping_status": f"MANUAL_MAPPING_COMPLETE__{status}",
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
    "PM-018": mapped("app/[locale]/medicines/page.tsx", "/{locale}/medicines", "20-53", "STATIC_MATCHED_PARTIAL", "Authenticated medicine discovery/search and detail handoff exist, but no pharmacy cart/offer/payment journey CTA is present.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "INSUFFICIENT_EVIDENCE"),
    "PM-180": mapped("app/[locale]/orders/page.tsx", "/{locale}/orders", "30-40", "STATIC_MATCHED_PARTIAL", "Read-only pharmacy-order history and client status tabs; no provider/payment/insurance lifecycle evidence.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-186": absent("No Web broadcast-status or pharmacy-offer surface was located in reviewed source; no mutation scan evidence for broadcast/select-offer exists."),
    "PM-187": mapped("app/[locale]/cart/page.tsx", "/{locale}/cart", "19-33", "STATIC_MATCHED_PARTIAL", "Cart summary renders server-returned groups/totals only; no cart mutation, submit, geo, Rx, offer or checkout CTA is evidenced.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "INSUFFICIENT_EVIDENCE"),
    "PM-189": mapped("app/[locale]/cart/checkout/page.tsx", "/{locale}/cart/checkout", "19-33", "MISSING_CAPABILITY", "Checkout route is a GET total preview with only a back link; no offer selection, payment, insurance or order submit CTA is evidenced.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
    "PM-195": absent("No Web order-confirmation surface or order-submit mutation was located in reviewed source; post-order read pages do not prove confirmation."),
    "PM-196": mapped("app/[locale]/orders/page.tsx", "/{locale}/orders", "30-40", "STATIC_MATCHED_PARTIAL", "Read-only pharmacy-order history; client status bucket is not an authoritative fulfillment/payment state machine.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-197": mapped("app/[locale]/orders/[orderId]/tracking/page.tsx", "/{locale}/orders/{orderId}/tracking", "19-44", "STATIC_MATCHED_PARTIAL", "Tracking is a protected read summary only; no accept-offer, payment, cancel, contact, dispute or delivery-confirmation CTA is evidenced.", "STATIC_MATCHED_PARTIAL", "STATIC_MATCHED_PARTIAL", "INSUFFICIENT_EVIDENCE"),
    "PM-198": absent("No Web pharmacy-payment route, local BFF handler or client payment mutation was located; appointment payment intent is booking-specific and not evidence for cart orders."),
    "PM-200": mapped("app/[locale]/medicines/[medicineId]/page.tsx", "/{locale}/medicines/{medicineId}", "16-64", "STATIC_MATCHED_PARTIAL", "Public medicine catalog detail exposes facts only and remains noindex; no price/stock/cart/Rx/offer CTA is evidenced.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "INSUFFICIENT_EVIDENCE"),
    "PM-201": mapped("app/[locale]/medicines/page.tsx", "/{locale}/medicines", "20-53", "STATIC_MATCHED_PARTIAL", "Authenticated medicine search exists; no filters, cart, offer or purchase transition is evidenced in the reviewed page.", "STATIC_MATCHED_PARTIAL", "MISSING_CAPABILITY", "INSUFFICIENT_EVIDENCE"),
    "PM-203": mapped("app/[locale]/cart/prescription/page.tsx", "/{locale}/cart/prescription", "18-30", "MISSING_CAPABILITY", "Prescription-cart preview displays medication names only; no Rx validation, submit, pharmacist review, broadcast, offer, payment or insurance flow is evidenced.", "MISSING_CAPABILITY", "MISSING_CAPABILITY", "MISSING_CAPABILITY"),
    "PM-205": absent("No Web waiting-for-pharmacy or offer-expiry/patient-selection surface was located in reviewed source."),
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
