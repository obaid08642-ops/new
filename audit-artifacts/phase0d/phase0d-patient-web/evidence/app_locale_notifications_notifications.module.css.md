# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/notifications/notifications.module.css`
- **Member SHA-256:** `29b5a5cce10461019ce463b4e57810ea6f9ee27cfc493f59b56fe5c066eca525`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `31: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .headerActions { gap: .45rem; } .settingsLink { padding-inline: .6rem; font-size: .74rem; } .headerIcon { inline-size: 3rem; block-size: 3rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `25: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `26: .state h1, .state h2 { margin: 0; color: var(--ink); font-size: 1.1rem; }`
- `27: .state p { max-inline-size: 38rem; margin: 0; line-height: 1.7; }`
- `28: .stateIcon { display: grid; place-items: center; inline-size: 3.35rem; block-size: 3.35rem; border: 1px solid rgba(8,127,140,.12); border-radius: var(--radius-lg); color: var(--brand-deep); background: var(--brand-soft); }`
### payment_insurance_relevance
- `12: .card { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: .9rem; padding: 1.15rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--shadow`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
