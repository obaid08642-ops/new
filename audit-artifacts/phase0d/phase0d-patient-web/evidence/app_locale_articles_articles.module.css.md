# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/articles/articles.module.css`
- **Member SHA-256:** `e03d921a0f2bb599bdb39c7df7bc9780b301273dcc85ca8173f0fbc094e8cb96`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `35: @media (max-width: 560px) { .page { gap: 1rem; padding-top: 1rem; } .search { align-items: stretch; } .search button { padding-inline: .7rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `27: .empty, .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76`
- `28: .empty h2, .empty p, .state h1, .state p { margin: 0; }`
- `29: .empty h2, .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `30: .empty p, .state p { max-inline-size: 38rem; line-height: 1.7; }`
### payment_insurance_relevance
- `14: .search button:focus-visible, .primary:focus-visible, .chip:focus-visible, .chipActive:focus-visible, .card:focus-visible, .back:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `15: @media (hover: hover) and (pointer: fine) { .search button:hover, .primary:hover { background: var(--brand-deep); } .card:hover { border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-lg); transform: translateY(-2px); } }`
- `20: .card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .9rem; padding: 1.15rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--`
- `36: @media (prefers-reduced-motion: reduce) { .card, .search button, .primary { transition: none; } .card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- `27: .empty, .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76`
- `28: .empty h2, .empty p, .state h1, .state p { margin: 0; }`
- `29: .empty h2, .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `30: .empty p, .state p { max-inline-size: 38rem; line-height: 1.7; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
