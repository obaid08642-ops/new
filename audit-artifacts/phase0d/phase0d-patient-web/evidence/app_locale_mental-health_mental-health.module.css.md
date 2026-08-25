# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/mental-health/mental-health.module.css`
- **Member SHA-256:** `99b16f733358dc02067689f53cd94849fc37b454879e1b07141a6da84da38a39`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `22: @media (max-width: 460px) { .page { gap: 1rem; padding-top: 1rem; } .grid { grid-template-columns: minmax(0, 1fr); } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `16: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `17: .state h1, .state p { margin: 0; }`
- `18: .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `19: .state p { line-height: 1.7; }`
### payment_insurance_relevance
- `9: .card { display: grid; align-content: start; gap: .7rem; min-inline-size: 0; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--shadow-md); }`
- `10: .card span { color: var(--muted); font-size: .84rem; font-weight: 700; line-height: 1.55; }`
- `11: .card strong { color: var(--ink); font-size: 1.05rem; overflow-wrap: anywhere; }`
- `12: a.card { color: inherit; text-decoration: none; transition: transform var(--motion-normal) var(--ease-premium), border-color var(--motion-normal) var(--ease-premium), box-shadow var(--motion-normal) var(--ease-premium); }`
- `13: a.card svg { color: var(--brand-deep); }`
- `14: a.card:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `15: @media (hover: hover) and (pointer: fine) { a.card:hover { border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-lg); transform: translateY(-2px); } }`
- `23: @media (prefers-reduced-motion: reduce) { a.card { transition: none; } a.card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
