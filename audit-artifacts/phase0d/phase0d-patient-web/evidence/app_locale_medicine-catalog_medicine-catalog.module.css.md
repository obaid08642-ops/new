# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicine-catalog/medicine-catalog.module.css`
- **Member SHA-256:** `2884e09eb0cbc34eda9d868fed19b92170c86297e6f892e83b399dc3546b825c`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `15: .submit { min-block-size: 3rem; white-space: nowrap; }`
- `35: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .hero { grid-template-columns: minmax(0, 1fr); padding: 1.2rem; } .heroIcon { display: none; } .search { grid-template-columns: minmax(0, 1fr); } .submit { inline-size: 100`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `29: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `30: .state h1 { margin: 0; color: var(--ink); font-size: 1.1rem; }`
- `31: .state p { margin: 0; line-height: 1.7; }`
- `32: .stateIcon { display: grid; place-items: center; inline-size: 3.2rem; block-size: 3.2rem; border: 1px solid rgba(8,127,140,.12); border-radius: var(--radius-lg); color: var(--brand-deep); background: var(--brand-soft); }`
### payment_insurance_relevance
- `18: .card { position: relative; display: grid; min-block-size: 12.5rem; align-content: start; gap: .6rem; overflow: hidden; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-`
- `19: .card:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `20: @media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-2px); border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-lg); } }`
- `21: .cardTop { display: flex; align-items: center; justify-content: space-between; gap: .6rem; }`
- `36: @media (prefers-reduced-motion: reduce) { .card, .fieldInput { transition: none; } .card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
