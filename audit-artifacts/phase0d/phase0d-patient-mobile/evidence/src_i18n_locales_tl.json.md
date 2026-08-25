# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/i18n/locales/tl.json`
- **Member SHA-256:** `7429a5787488591d8c08c71ec94bdcd9e3ea194a66241dfa3875219fb3fb1f65`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: "cancel": "Kanselahin",`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: "cancel": "Kanselahin",`
- `9: "loading": "Naglo-load..."`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: "cancel": "Kanselahin",`
- `9: "loading": "Naglo-load..."`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
