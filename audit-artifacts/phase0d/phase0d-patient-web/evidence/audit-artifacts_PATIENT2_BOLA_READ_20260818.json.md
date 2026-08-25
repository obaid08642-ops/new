# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT2_BOLA_READ_20260818.json`
- **Member SHA-256:** `0fec2c82571402feab0a36fa065aa7808e3493241a8f146cbf45dac28449d7c2`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: {"login_status":201,"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","foreign_read_status":403,"foreign_read_body_bytes":71}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: {"login_status":201,"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","foreign_read_status":403,"foreign_read_body_bytes":71}`
### state_transitions
- `1: {"login_status":201,"order_id":"62039080-53eb-4ca2-8bac-69c2a7bb038f","foreign_read_status":403,"foreign_read_body_bytes":71}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
