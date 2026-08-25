# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/prescriptions/prescriptions.module.css`
- **Member SHA-256:** `7dc04af09ff07cbddfdeea5f9ae6c5ede6505e668dacffcff90355788d982c75`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `28: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .intro { padding: 1.2rem; } .grid { grid-template-columns: minmax(0, 1fr); } .introIcon { inline-size: 3.1rem; block-size: 3.1rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `15: .status { color: var(--ink); font-size: 1rem; overflow-wrap: anywhere; }`
- `22: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `23: .state svg { color: var(--brand-deep); }`
- `24: .state h1, .state p { margin: 0; }`
- `25: .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `26: .state p { max-inline-size: 38rem; line-height: 1.7; }`
### payment_insurance_relevance
- `11: .card { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: .9rem; min-inline-size: 0; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-s`
- `12: @media (hover: hover) and (pointer: fine) { .card:hover { border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-lg); transform: translateY(-2px); } }`
- `13: .cardIcon { display: grid; place-items: center; inline-size: 2.7rem; block-size: 2.7rem; border-radius: var(--radius-md); color: var(--brand-deep); background: var(--brand-soft); }`
- `14: .cardBody { display: grid; gap: .4rem; min-inline-size: 0; }`
- `29: @media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
