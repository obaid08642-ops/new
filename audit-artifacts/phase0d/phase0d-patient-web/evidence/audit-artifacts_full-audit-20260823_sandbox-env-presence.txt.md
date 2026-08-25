# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/sandbox-env-presence.txt`
- **Member SHA-256:** `a0726d501b0978c5a72e9566779ff50ec506e6bab0e76444e3b825c1e4709b08`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: NABD_SANDBOX_PATIENT_OTP=missing`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `6: NABD_SANDBOX_PAYMENT_METHOD_ID=missing`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
