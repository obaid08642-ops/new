# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/chat/chat.module.css`
- **Member SHA-256:** `20114c0f28995eefabd1498ad8934e3cd48336889dc2fc2902c6318566bdd02d`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display:grid; gap:1rem; padding:1.6rem 0 3.5rem; }`
- `4: @media (max-width:540px) { .page { padding-top:.9rem; }.grid { grid-template-columns:1fr; }.introIcon { width:3rem; height:3rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(17rem,1fr)); gap:.8rem; }.card { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:.8rem; min-width:0; padding:1rem; border:1px solid rgba(229,`
### payment_insurance_relevance
- `3: .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(17rem,1fr)); gap:.8rem; }.card { display:grid; grid-template-columns:auto minmax(0,1fr); align-items:center; gap:.8rem; min-width:0; padding:1rem; border:1px solid rgba(229,`
- `5: @media (prefers-reduced-motion:reduce) { .card { transition:none; }.card:hover { transform:none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
