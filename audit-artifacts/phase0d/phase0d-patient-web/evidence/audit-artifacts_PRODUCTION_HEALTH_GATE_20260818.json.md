# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PRODUCTION_HEALTH_GATE_20260818.json`
- **Member SHA-256:** `96d1c21a2d64c6c494ca586d4c7e4a144a350afde07d2a0fc979d56214fdb2ee`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: "base": "https://api.nabd.plus/api/v1",`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: "liveness": {"status": 200, "body": {"status": "up"}},`
- `6: "readiness": {"status": 200, "body": {"status": "ok", "details": {"mongodb": "up", "redis": "up"}}},`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
