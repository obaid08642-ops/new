# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE2_MATRIX_SUMMARY.json`
- **Member SHA-256:** `6f73b1934ecea1d0c385abeb3c30abeb9950f65201688b60cdb6f568570e1b2f`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: "missing-or-merged-route-review": 200,`
- `5: "partial-route-contract-review": 14,`
- `6: "partial-route-only": 36`
- `53: "routes": 54`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: "statuses": {`
### payment_insurance_relevance
- `25: "insurance": 13,`
- `33: "offers": 2,`
- `35: "payments": 4,`
- `50: "wallet": 5,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
