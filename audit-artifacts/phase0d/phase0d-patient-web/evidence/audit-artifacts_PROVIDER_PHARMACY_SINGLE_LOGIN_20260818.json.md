# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_PHARMACY_SINGLE_LOGIN_20260818.json`
- **Member SHA-256:** `3cb37ca287cb0e91594079c240d59ed9ea283ee438265bbde961a6bf3312d8fe`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: {"status":201,"body":"redacted_token_response"}`
### state_transitions
- `1: {"status":201,"body":"redacted_token_response"}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
