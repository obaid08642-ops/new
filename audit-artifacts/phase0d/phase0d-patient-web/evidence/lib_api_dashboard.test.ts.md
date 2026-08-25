# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/dashboard.test.ts`
- **Member SHA-256:** `c2a6a9a938e4f15537ed1c8a413e8d421b9fc712c574de604ca0e026b0cb0f08`
- **Line count:** 19
- **Read range:** `1-19`
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
- `5: it("extracts only approved profile display fields", () => {`
- `11: expect(parseDashboardAppointment({ data: { id: "apt-1", doctor_name: "Dr. Verified", scheduled_at: "2026-08-20T10:00:00Z", status: "CONFIRMED" } })).toEqual({`
- `15: status: "CONFIRMED",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
