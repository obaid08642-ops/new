# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/dashboard/dashboard.module.css`
- **Member SHA-256:** `4dad3d924fd9b2be0e5b1945e0e04615476bb9d1402f8ac7666dea02b006279a`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `40: .appointmentSummary span, .emptySummary { color: var(--muted); line-height: 1.6; }`
### payment_insurance_relevance
- `26: .featureCard { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.75rem; min-width: 0; min-height: 5.6rem; padding: 0.85rem; border: 1px solid rgba(229,232,238,.9); border-radius: 1.2rem; background:`
- `27: .featureCard:hover, .featureCard:focus-visible { outline: none; box-shadow: 0 10px 24px rgba(20, 26, 42, 0.1); transform: translateY(-2px); }`
- `36: @media (prefers-reduced-motion: reduce) { .iconAction, .quickTile, .featureCard, .moreLink { transition: none; } }`
### error_empty_loading_retry_cancel
- `40: .appointmentSummary span, .emptySummary { color: var(--muted); line-height: 1.6; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
