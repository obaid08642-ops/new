# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/appointments/appointments.module.css`
- **Member SHA-256:** `5d3df816447d22c923608d15b630f7b9e3fa168f2063de09fab8d88be6ecaaad`
- **Line count:** 151
- **Read range:** `1-151`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page {`
- `140: .page { gap: 1.1rem; padding-top: 1rem; }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `35: .headerIcon, .serviceIcon, .stateIcon {`
- `117: .status { max-inline-size: 55%; overflow: hidden; border-radius: var(--radius-full); padding: .3rem .6rem; color: var(--status-color); background: var(--status-surface); font-size: .74rem; font-weight: 760; text-overflow: ellipsis; white-sp`
- `123: .state {`
- `135: .stateIcon { inline-size: 3.35rem; block-size: 3.35rem; border: 1px solid rgba(8,127,140,.12); border-radius: var(--radius-lg); }`
- `136: .state h1, .state h2 { margin: 0; color: var(--ink); font-size: 1.1rem; }`
- `137: .state p { max-inline-size: 38rem; margin: 0; line-height: 1.7; }`
### payment_insurance_relevance
- `96: .card {`
- `108: .card:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `111: .card:hover { border-color: rgba(8,127,140,.34); box-shadow: var(--shadow-lg); transform: translateY(-2px); }`
- `114: .cardTop { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }`
- `148: .tab, .tabActive, .card { transition: none; }`
- `149: .card:hover, .tab:hover, .specialtiesLink:hover { transform: none; }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
