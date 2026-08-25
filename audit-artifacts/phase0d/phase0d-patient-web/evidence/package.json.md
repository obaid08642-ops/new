# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `package.json`
- **Member SHA-256:** `ea3064c638d18f64d00e406126bf9b9575b12a920a4f33bef91b91d52e2a7306`
- **Line count:** 117
- **Read range:** `1-117`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `47: "@trpc/client": "^11.18.0",`
- `48: "@trpc/react-query": "^11.18.0",`
- `49: "@trpc/server": "^11.18.0",`
- `50: "axios": "^1.19.0",`
### auth_ownership
- `54: "cookie": "^1.0.2",`
- `61: "input-otp": "^1.4.2",`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `29: "@radix-ui/react-hover-card": "^1.1.15",`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
