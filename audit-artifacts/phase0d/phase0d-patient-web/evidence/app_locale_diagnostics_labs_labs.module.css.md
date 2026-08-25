# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/labs/labs.module.css`
- **Member SHA-256:** `d62cfe9ca8903265889a54e3ed68100cdbb41b0fcd083eecf74a0fe4d5e98dac`
- **Line count:** 47
- **Read range:** `1-47`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `30: .submit, .action { display: inline-flex; align-items: center; justify-content: center; min-block-size: 2.8rem; padding: .65rem 1rem; border: 0; border-radius: var(--radius-lg); color: white; background: var(--brand-deep); font-weight: 760; `
- `46: @media (max-width: 540px) { .page { padding-top: 1rem; } .hero, .detailHero { padding: 1.2rem; } .heroIcon { inline-size: 3.1rem; block-size: 3.1rem; } .filters { align-items: stretch; } .search { flex-basis: 100%; } .toggle, .submit { flex`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `41: .state { display: grid; justify-items: center; gap: .6rem; padding: 3rem 1.25rem; border: 1px dashed rgba(8,127,140,.25); border-radius: var(--radius-xl); color: var(--muted); text-align: center; background: rgba(231,247,247,.6); }`
- `42: .state h1, .state h2, .state p { margin: 0; }`
- `43: .state h1, .state h2 { color: var(--ink); }`
### payment_insurance_relevance
- `32: .card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: .8rem; padding: 1.1rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--sh`
- `33: .card:hover { border-color: rgba(8,127,140,.35); box-shadow: var(--shadow-md); transform: translateY(-2px); }`
- `47: @media (prefers-reduced-motion: reduce) { .card { transition: none; } .card:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
