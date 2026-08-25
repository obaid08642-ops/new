# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/login/login.module.css`
- **Member SHA-256:** `cb9ce232b0d6cf894736462c18200023c247e58015b8513efc31720e5622fdb7`
- **Line count:** 87
- **Read range:** `1-87`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page {`
- `85: .page { min-block-size: calc(100vh - 7.6rem); padding: 1rem 0 2rem; }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `8: .card {`
- `19: .card::before {`
- `30: .card > * { position: relative; z-index: 1; }`
- `56: .card h1 {`
- `86: .card { border-radius: var(--radius-xl); }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
