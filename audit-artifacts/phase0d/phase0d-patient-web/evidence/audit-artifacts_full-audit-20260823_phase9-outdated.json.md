# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase9-outdated.json`
- **Member SHA-256:** `8b45a58fdadcb53830ee36d5d064fea878e42c3c6116461b592b9d72743d95d4`
- **Line count:** 485
- **Read range:** `1-485`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `296: "input-otp": {`
- `380: "cookie": {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `51: "@radix-ui/react-hover-card": {`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
