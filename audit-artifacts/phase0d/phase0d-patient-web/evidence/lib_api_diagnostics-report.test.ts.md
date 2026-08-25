# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/diagnostics-report.test.ts`
- **Member SHA-256:** `f5cc7ad94f0c997fb0bdae3a6bd806a6b3410a16edf4afa02734b764a887924f`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { extractDiagnosticBooking } from "./diagnostics";`
- `3: describe("diagnostic report marker", () => { it("keeps only report availability and never exposes the report URL", () => { expect(extractDiagnosticBooking({ id:"00000000-0000-4000-8000-000000000001", state:"REPORT_READY", signed_report_pdf_`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: describe("diagnostic report marker", () => { it("keeps only report availability and never exposes the report URL", () => { expect(extractDiagnosticBooking({ id:"00000000-0000-4000-8000-000000000001", state:"REPORT_READY", signed_report_pdf_`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
