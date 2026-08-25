# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_READONLY_LIVE_MATRIX_20260818.json`
- **Member SHA-256:** `ad0248a31c4e6151bc7a6a89a52647de7a06e389a8b9dd5a6c1f10a44499b60c`
- **Line count:** 74
- **Read range:** `1-74`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: "login": {`
- `15: "login": {`
- `27: "login": {`
- `39: "login": {`
- `45: "retry_after"`
- `51: "login": {`
- `57: "retry_after"`
- `63: "login": {`
- `69: "retry_after"`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: "login": {`
- `15: "login": {`
- `27: "login": {`
- `39: "login": {`
- `51: "login": {`
- `63: "login": {`
### state_transitions
- `4: "status": 404,`
- `8: "error",`
- `9: "statusCode"`
- `16: "status": 404,`
- `20: "error",`
- `21: "statusCode"`
- `28: "status": 404,`
- `32: "error",`
- `33: "statusCode"`
- `40: "status": 429,`
- `43: "statusCode",`
- `45: "retry_after"`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: "error",`
- `20: "error",`
- `32: "error",`
- `45: "retry_after"`
- `57: "retry_after"`
- `69: "retry_after"`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
