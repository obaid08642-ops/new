# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/AUTHORITATIVE_SOURCE_HASH_SNAPSHOT_20260818.txt`
- **Member SHA-256:** `9b5b3b7a4c5c59b34760303e1966528b0af2daaa8cdb63ce00d7778cec15e2e3`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: [/home/ubuntu/nabdah-live-extracted/admin-app/web-admin]`
- `13: [/home/ubuntu/admin-build-work/web-admin]`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
