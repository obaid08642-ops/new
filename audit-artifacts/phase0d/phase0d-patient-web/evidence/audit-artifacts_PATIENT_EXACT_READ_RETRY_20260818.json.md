# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_EXACT_READ_RETRY_20260818.json`
- **Member SHA-256:** `2511f33d06b0a7990bea3722409c01fe0951ee85943ce7a4794a7a8fdb4d7643`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: {"scope":"patient.sandbox read-only exact contract retry","results":[{"path":"/doctors/appointments/mine","status":200,"body_bytes":2},{"path":"/notifications","status":200,"body_bytes":40746},{"path":"/wallet/balance","status":200,"body_by`
### backend_consumers_or_contracts
- `1: {"scope":"patient.sandbox read-only exact contract retry","results":[{"path":"/doctors/appointments/mine","status":200,"body_bytes":2},{"path":"/notifications","status":200,"body_bytes":40746},{"path":"/wallet/balance","status":200,"body_by`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: {"scope":"patient.sandbox read-only exact contract retry","results":[{"path":"/doctors/appointments/mine","status":200,"body_bytes":2},{"path":"/notifications","status":200,"body_bytes":40746},{"path":"/wallet/balance","status":200,"body_by`
### payment_insurance_relevance
- `1: {"scope":"patient.sandbox read-only exact contract retry","results":[{"path":"/doctors/appointments/mine","status":200,"body_bytes":2},{"path":"/notifications","status":200,"body_bytes":40746},{"path":"/wallet/balance","status":200,"body_by`
### error_empty_loading_retry_cancel
- `1: {"scope":"patient.sandbox read-only exact contract retry","results":[{"path":"/doctors/appointments/mine","status":200,"body_bytes":2},{"path":"/notifications","status":200,"body_bytes":40746},{"path":"/wallet/balance","status":200,"body_by`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
