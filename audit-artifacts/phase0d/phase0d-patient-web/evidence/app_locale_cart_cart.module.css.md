# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/cart/cart.module.css`
- **Member SHA-256:** `a1465e28fd18b73edf10d0cc0057ba78e26d31e63068902540d732585c64bfa2`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `36: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .hero { padding: 1.2rem; } .heroIcon { display: none; } .group, .total { padding: 1rem; } .item { align-items: flex-start; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `27: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `28: .state svg { color: var(--brand-deep); }`
- `29: .state h1, .state h2, .state p { margin: 0; }`
- `30: .state h1, .state h2 { color: var(--ink); font-size: 1.1rem; }`
- `31: .state p { max-inline-size: 38rem; line-height: 1.7; }`
### payment_insurance_relevance
- `22: .total { display: grid; grid-template-columns: 1fr auto; gap: .75rem 1rem; padding: 1.2rem; border: 1px solid rgba(8,127,140,.17); border-radius: var(--radius-xl); background: linear-gradient(135deg, rgba(231,247,247,.76), rgba(255,255,255,`
- `23: .total span { color: var(--muted); font-size: .88rem; }`
- `24: .total strong { color: var(--ink); font-size: .96rem; font-variant-numeric: tabular-nums; }`
- `25: .total span:last-of-type, .total strong:last-child { padding-top: .8rem; border-top: 1px solid rgba(8,127,140,.18); color: var(--brand-deep); font-size: 1.12rem; font-weight: 800; }`
- `36: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .hero { padding: 1.2rem; } .heroIcon { display: none; } .group, .total { padding: 1rem; } .item { align-items: flex-start; } }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
