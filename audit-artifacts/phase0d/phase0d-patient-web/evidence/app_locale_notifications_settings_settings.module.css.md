# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/notifications/settings/settings.module.css`
- **Member SHA-256:** `eb8d8a4833e9957e11e6534f47cfcbdeb99abaf295850f9f3dd3ee95815f7ac3`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `23: @media (max-width: 560px) { .page { gap: 1rem; padding-top: 1rem; } .header { align-items: flex-start; padding: 1.2rem; } .headerIcon { display: none; } .card { grid-template-columns: auto minmax(0, 1fr); align-items: start; } .value { grid`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `19: .state { display: grid; justify-items: start; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(2`
- `20: .state h1 { margin: 0; color: var(--ink); font-size: 1.1rem; }`
- `21: .state p { margin: 0; line-height: 1.7; }`
### payment_insurance_relevance
- `11: .card { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .9rem; padding: 1.15rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--`
- `23: @media (max-width: 560px) { .page { gap: 1rem; padding-top: 1rem; } .header { align-items: flex-start; padding: 1.2rem; } .headerIcon { display: none; } .card { grid-template-columns: auto minmax(0, 1fr); align-items: start; } .value { grid`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
