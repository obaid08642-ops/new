# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/home-care.module.css`
- **Member SHA-256:** `6379a06ddff234d1b4d38630c77bbd9a1e9c882b9c59dc69c9cd0cb7a14f6580`
- **Line count:** 45
- **Read range:** `1-45`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page {`
- `44: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .intro { padding: 1.2rem; } .introIcon { inline-size: 3.1rem; block-size: 3.1rem; } .grid { grid-template-columns: minmax(0, 1fr); } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `34: .status { color: var(--brand-deep); font-size: .8rem; font-weight: 700; }`
- `38: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `39: .state svg { color: var(--brand-deep); }`
- `40: .state h1, .state p { margin: 0; }`
- `41: .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `42: .state p { max-inline-size: 38rem; line-height: 1.7; }`
### payment_insurance_relevance
- `29: .card { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: .9rem; min-inline-size: 0; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-s`
- `30: @media (hover: hover) and (pointer: fine) { .card:hover { border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-lg); transform: translateY(-2px); } }`
- `31: .cardIcon { display: grid; place-items: center; inline-size: 2.7rem; block-size: 2.7rem; border-radius: var(--radius-md); color: var(--brand-deep); background: var(--brand-soft); }`
- `32: .cardBody { display: grid; gap: .38rem; min-inline-size: 0; }`
- `45: @media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
