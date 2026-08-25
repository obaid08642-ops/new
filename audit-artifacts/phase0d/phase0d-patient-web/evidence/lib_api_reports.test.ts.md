# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/reports.test.ts`
- **Member SHA-256:** `489ebe5bbcfac0ae2d6a141ef7a9e82acca848aeeed0fab2a695a0d67c3984ac`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: describe("reports parser", () => { it("keeps metadata and drops report body and attachment data", () => { expect(parseReports([{ id: "report-1", date: "2026-01-01", title: "Lab report", doctor: "Verified doctor", facility: "Verified facilit`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: describe("reports parser", () => { it("keeps metadata and drops report body and attachment data", () => { expect(parseReports([{ id: "report-1", date: "2026-01-01", title: "Lab report", doctor: "Verified doctor", facility: "Verified facilit`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
