# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_PHARMACY_EXACT_READ_20260818.json`
- **Member SHA-256:** `6e0829b29b84ea79bef3ecdd4fe8eb7134ba403fcbc23f136130921375ae3ddb`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: {"scope":"pharmacy.sandbox read-only exact contract probe","results":[{"path":"/provider-onboarding/progress","status":200,"body_bytes":17},{"path":"/notifications","status":200,"body_bytes":2},{"path":"/wallet/balance","status":200,"body_b`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: {"scope":"pharmacy.sandbox read-only exact contract probe","results":[{"path":"/provider-onboarding/progress","status":200,"body_bytes":17},{"path":"/notifications","status":200,"body_bytes":2},{"path":"/wallet/balance","status":200,"body_b`
### payment_insurance_relevance
- `1: {"scope":"pharmacy.sandbox read-only exact contract probe","results":[{"path":"/provider-onboarding/progress","status":200,"body_bytes":17},{"path":"/notifications","status":200,"body_bytes":2},{"path":"/wallet/balance","status":200,"body_b`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
