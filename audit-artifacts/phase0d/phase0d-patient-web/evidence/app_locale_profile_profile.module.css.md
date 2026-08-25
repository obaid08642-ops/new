# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/profile/profile.module.css`
- **Member SHA-256:** `87f12f80c172566acd0b49a8372a7fce83f0b89a5f87876802b576be33db4d71`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `36: @media (max-width: 430px) { .page { gap: 1rem; padding-top: 1rem; } .quick { grid-template-columns: minmax(0, 1fr); } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `28: .state { display: grid; justify-items: start; gap: .75rem; min-block-size: 9rem; padding: 1.15rem; color: var(--muted); }`
- `29: .state p { margin: 0; line-height: 1.7; }`
- `30: .stateAlert { color: var(--danger); }`
- `31: .stateIcon { display: grid; place-items: center; inline-size: 2.35rem; block-size: 2.35rem; border-radius: var(--radius-md); color: var(--brand-deep); background: var(--brand-soft); }`
- `32: .stateIconAlert { color: var(--danger); background: #fff0ee; }`
### payment_insurance_relevance
- `11: .quickCard { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .6rem; min-inline-size: 0; padding: .8rem; border: 1px solid var(--line); border-radius: var(--radius-lg); color: var(--ink); background:`
- `12: .quickCard:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `13: @media (hover: hover) and (pointer: fine) { .quickCard:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--quick-accent) 42%, var(--line)); box-shadow: var(--shadow-md); } }`
- `37: @media (prefers-reduced-motion: reduce) { .quickCard { transition: none; } .quickCard:hover { transform: none; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
