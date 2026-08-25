# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_READONLY_LIVE_MATRIX_20260818.json`
- **Member SHA-256:** `b22acfcb9fe0d92c2930cd8e404eaf6127d8004d04f012f22a2990770b913605`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: "login": {"status": "success", "token_received": true},`
- `5: {"path":"/profile","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `7: {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},`
- `11: {"path":"/appointments/mine","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `14: {"path":"/hospitals","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `22: "note": "404s may be stale route guesses rather than source defects; next step is exact consumer-to-controller reconciliation before any mutation."`
### backend_consumers_or_contracts
- `6: {"path":"/notifications","status":200,"classification":"PASS_READ"},`
- `8: {"path":"/wallet/balance","status":200,"classification":"PASS_READ"},`
- `9: {"path":"/wallet/transactions","status":200,"classification":"PASS_READ"},`
- `10: {"path":"/orders/mine","status":200,"classification":"PASS_READ"},`
- `11: {"path":"/appointments/mine","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `15: {"path":"/labs/packages","status":200,"classification":"PASS_READ"},`
- `16: {"path":"/radiology/services","status":200,"classification":"PASS_READ"},`
- `17: {"path":"/pharmacy/products","status":200,"classification":"PASS_READ"},`
- `18: {"path":"/home-care/services","status":200,"classification":"PASS_READ"},`
- `19: {"path":"/insurance/companies","status":200,"classification":"PASS_READ"},`
### auth_ownership
- `3: "login": {"status": "success", "token_received": true},`
- `12: {"path":"/services","status":403,"classification":"CONTRACT_OR_ROLE_MISMATCH"},`
### state_transitions
- `3: "login": {"status": "success", "token_received": true},`
- `5: {"path":"/profile","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `6: {"path":"/notifications","status":200,"classification":"PASS_READ"},`
- `7: {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},`
- `8: {"path":"/wallet/balance","status":200,"classification":"PASS_READ"},`
- `9: {"path":"/wallet/transactions","status":200,"classification":"PASS_READ"},`
- `10: {"path":"/orders/mine","status":200,"classification":"PASS_READ"},`
- `11: {"path":"/appointments/mine","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `12: {"path":"/services","status":403,"classification":"CONTRACT_OR_ROLE_MISMATCH"},`
- `13: {"path":"/doctors","status":200,"classification":"PASS_READ"},`
- `14: {"path":"/hospitals","status":404,"classification":"UNRECONCILED_ROUTE"},`
- `15: {"path":"/labs/packages","status":200,"classification":"PASS_READ"},`
### payment_insurance_relevance
- `8: {"path":"/wallet/balance","status":200,"classification":"PASS_READ"},`
- `9: {"path":"/wallet/transactions","status":200,"classification":"PASS_READ"},`
- `19: {"path":"/insurance/companies","status":200,"classification":"PASS_READ"},`
### error_empty_loading_retry_cancel
- `7: {"path":"/family","status":404,"classification":"UNRECONCILED_ROUTE_OR_EMPTY_CONTRACT"},`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
