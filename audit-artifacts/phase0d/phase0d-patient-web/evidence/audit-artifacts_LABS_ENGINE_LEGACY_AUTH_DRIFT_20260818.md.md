# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/LABS_ENGINE_LEGACY_AUTH_DRIFT_20260818.md`
- **Member SHA-256:** `8307d877a39c0f63d498b40e3313ab735d9d47f681371f6dcbdfe05f947911d6`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The inspected backend snapshot declares `LabsEngineController` at `src/modules/labs/controllers/labs-engine.controller.ts` with routes under `labs/bookings`:`
- `12: The controller source does not show `JwtAuthGuard`, `CurrentUser`, provider-role validation, or ownership checks on these methods. `respond` trusts `lab_id` from the request body, and collection/finalization update by booking ID alone. This`
- `16: Do not execute these legacy lifecycle mutations. The live provider read contract used `/labs/provider/inbox` and `/labs/samples`, which returned 200 for the sandbox laboratory account. The legacy controller must first be reconciled against `
- `18: Classification: **SOURCE_SECURITY_DRIFT / LIFECYCLE_BLOCKED**. This is not asserted as a live production exploit until route exposure is independently confirmed.`
### backend_consumers_or_contracts
- `5: The inspected backend snapshot declares `LabsEngineController` at `src/modules/labs/controllers/labs-engine.controller.ts` with routes under `labs/bookings`:`
- `12: The controller source does not show `JwtAuthGuard`, `CurrentUser`, provider-role validation, or ownership checks on these methods. `respond` trusts `lab_id` from the request body, and collection/finalization update by booking ID alone. This`
- `16: Do not execute these legacy lifecycle mutations. The live provider read contract used `/labs/provider/inbox` and `/labs/samples`, which returned 200 for the sandbox laboratory account. The legacy controller must first be reconciled against `
### auth_ownership
- `1: # Legacy LabsEngine auth/ownership drift — 2026-08-18`
- `9: - `POST /collect-sample/:id` with `{ barcodeToken }``
- `12: The controller source does not show `JwtAuthGuard`, `CurrentUser`, provider-role validation, or ownership checks on these methods. `respond` trusts `lab_id` from the request body, and collection/finalization update by booking ID alone. This`
- `16: Do not execute these legacy lifecycle mutations. The live provider read contract used `/labs/provider/inbox` and `/labs/samples`, which returned 200 for the sandbox laboratory account. The legacy controller must first be reconciled against `
### state_transitions
- `18: Classification: **SOURCE_SECURITY_DRIFT / LIFECYCLE_BLOCKED**. This is not asserted as a live production exploit until route exposure is independently confirmed.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
