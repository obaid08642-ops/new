# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_O_DIAGNOSTICS_TRUTHFULNESS_20260819.md`
- **Member SHA-256:** `775b11f4a639595d79a1a16af306a188a82da61180c363c55f2cae55604d6c44`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Phase 8 — Batch O: diagnostics booking and report truthfulness`
- `5: The authoritative Patient source already redirects the old fabricated diagnostic confirmation/checkout/sample-tracking routes back to the diagnostics hub rather than presenting fake quote, tax, appointment or tracking facts. This batch remo`
- `11: | Legacy booking/checkout | `diagnostics/booking-confirm`, `checkout` and sample tracking are already fail-closed redirects; they do not create a fake booking, tax, fee, slot or confirmation. |`
- `12: | Diagnostic results/history | Patient result screens no longer pass `url`, `url_base64`, signed PDF or report-link data as navigation parameters. They route through the booking detail or a report ID only. |`
- `13: | Booking detail download | The report action no longer opens `report_url`, `result_pdf_url`, report asset URLs, scan/DICOM URLs or arbitrary booking-provided URI. It opens `/reports/view-report` only when a server-owned report identifier i`
- `24: | Branch upload | **PASS** — source commit `0ccec6f` (`fix: remove raw diagnostic report links`) is on `manus/on-live-reconciliation`. |`
- `28: Patient report viewing now depends on a correctly implemented protected `/reports/:id` contract. Phase 9/11 must prove lab/radiology report IDs, access scope, report-release state, server-generated signed access and expiry with sandbox reco`
### backend_consumers_or_contracts
- `28: Patient report viewing now depends on a correctly implemented protected `/reports/:id` contract. Phase 9/11 must prove lab/radiology report IDs, access scope, report-release state, server-generated signed access and expiry with sandbox reco`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: The authoritative Patient source already redirects the old fabricated diagnostic confirmation/checkout/sample-tracking routes back to the diagnostics hub rather than presenting fake quote, tax, appointment or tracking facts. This batch remo`
- `28: Patient report viewing now depends on a correctly implemented protected `/reports/:id` contract. Phase 9/11 must prove lab/radiology report IDs, access scope, report-release state, server-generated signed access and expiry with sandbox reco`
### payment_insurance_relevance
- `5: The authoritative Patient source already redirects the old fabricated diagnostic confirmation/checkout/sample-tracking routes back to the diagnostics hub rather than presenting fake quote, tax, appointment or tracking facts. This batch remo`
- `11: | Legacy booking/checkout | `diagnostics/booking-confirm`, `checkout` and sample tracking are already fail-closed redirects; they do not create a fake booking, tax, fee, slot or confirmation. |`
- `28: Patient report viewing now depends on a correctly implemented protected `/reports/:id` contract. Phase 9/11 must prove lab/radiology report IDs, access scope, report-release state, server-generated signed access and expiry with sandbox reco`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
