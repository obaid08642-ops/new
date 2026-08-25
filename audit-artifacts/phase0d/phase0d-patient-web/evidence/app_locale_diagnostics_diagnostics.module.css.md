# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/diagnostics.module.css`
- **Member SHA-256:** `8feeba76cd1f75e3e75107d75268bd4ab808ea5f98d6307a401bf7d3b1dc370b`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page {`
- `63: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .intro { padding: 1.2rem; } .introIcon { inline-size: 3.1rem; block-size: 3.1rem; } .domain { padding: 1rem; } .open { display: none; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `52: .status, .date { color: var(--muted); font-size: .78rem; }`
- `57: .alert, .empty { margin: 0; padding: 1rem; border-radius: var(--radius-md); color: var(--muted); line-height: 1.7; }`
- `59: .empty { border: 1px dashed rgba(8,127,140,.25); background: rgba(231,247,247,.6); }`
### payment_insurance_relevance
- `42: .domainIcon, .cardIcon { display: grid; place-items: center; flex: 0 0 auto; border-radius: var(--radius-md); color: var(--brand-deep); background: var(--brand-soft); }`
- `46: .card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .75rem; padding: .9rem; border: 1px solid var(--line); border-radius: var(--radius-lg); color: inherit; background: rgba(255,255,255,.76); tex`
- `47: .card:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `48: @media (hover: hover) and (pointer: fine) { .card:hover { border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-sm); transform: translateY(-2px); } }`
- `49: .cardIcon { inline-size: 2.5rem; block-size: 2.5rem; }`
- `50: .cardBody { display: grid; gap: .28rem; min-inline-size: 0; }`
- `64: @media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- `57: .alert, .empty { margin: 0; padding: 1rem; border-radius: var(--radius-md); color: var(--muted); line-height: 1.7; }`
- `59: .empty { border: 1px dashed rgba(8,127,140,.25); background: rgba(231,247,247,.6); }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
