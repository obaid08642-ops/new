# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/health/health.module.css`
- **Member SHA-256:** `c718b0e1347448e11df7b4057930595d91016ab28cc5202bf2ab45c726cc5447`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `32: @media (max-width: 520px) { .page { gap: 1rem; padding-top: 1rem; } .grid, .cards { grid-template-columns: minmax(0, 1fr); } .heroIcon { display: none; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `24: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `25: .state p { margin: 0; line-height: 1.7; }`
### payment_insurance_relevance
- `16: .grid, .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }`
- `17: .card { display: grid; gap: .9rem; min-inline-size: 0; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--shadow-md); }`
- `18: .cardTop { display: flex; align-items: center; justify-content: space-between; gap: .75rem; color: var(--muted); font-size: .84rem; font-weight: 730; }`
- `30: @media (max-width: 860px) { .grid, .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }`
- `32: @media (max-width: 520px) { .page { gap: 1rem; padding-top: 1rem; } .grid, .cards { grid-template-columns: minmax(0, 1fr); } .heroIcon { display: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
