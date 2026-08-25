# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/call-token-launcher.module.css`
- **Member SHA-256:** `99692b6d0f2a374116ab81185d96e6974a8776155d97d3c999b447bdfed94a8b`
- **Line count:** 1
- **Read range:** `1-1`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: .panel{display:grid;gap:.8rem;margin-top:1rem;padding:1.1rem;border:1px solid rgba(8,127,140,.15);border-radius:var(--radius-xl);background:rgba(255,255,255,.84);box-shadow:var(--shadow-sm)}.heading{display:flex;align-items:center;gap:.5rem`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: .panel{display:grid;gap:.8rem;margin-top:1rem;padding:1.1rem;border:1px solid rgba(8,127,140,.15);border-radius:var(--radius-xl);background:rgba(255,255,255,.84);box-shadow:var(--shadow-sm)}.heading{display:flex;align-items:center;gap:.5rem`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
