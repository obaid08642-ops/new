# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_PHARMACY_HISTORY_LIVE_RECHECK_20260818.json`
- **Member SHA-256:** `248006a210af0b04e51fbaed109a229d531cee8f1345b720ca8793ab54d68d99`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: {"path":"/provider/pharmacy/allocations?status=completed","status":200,"body_bytes":2}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: {"path":"/provider/pharmacy/allocations?status=completed","status":200,"body_bytes":2}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
