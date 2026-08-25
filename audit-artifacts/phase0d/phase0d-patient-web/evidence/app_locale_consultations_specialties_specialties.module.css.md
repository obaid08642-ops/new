# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/consultations/specialties/specialties.module.css`
- **Member SHA-256:** `1b7c9667a1cdd67acdbbf64fc41d158e2c24e412dccedb01f0cd9cf8fd15f25c`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { max-width: 980px; margin: 0 auto; padding: 40px 20px 72px; }`
- `20: .retry { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; color: white; text-decoration: none; border-radius: 13px; background: var(--primary); transition: transform 160ms cubic-bezier(.23,1,.32,1); }`
- `21: .retry:active { transform: scale(.97); }`
- `22: @media (max-width: 700px) { .page { padding: 24px 14px 56px; } .hero { align-items: flex-start; padding: 22px; } .grid { grid-template-columns: 1fr; } }`
- `23: @media (prefers-reduced-motion: reduce) { .card, .retry { transition: none; } .card:hover, .card:active, .retry:active { transform: none; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `6: .heroIcon, .stateIcon { display: grid; place-items: center; width: 62px; height: 62px; flex: 0 0 auto; color: var(--primary); border-radius: 22px; background: color-mix(in srgb, var(--primary) 12%, transparent); }`
- `17: .state { display: grid; justify-items: center; gap: 12px; padding: 76px 24px; text-align: center; border: 1px dashed color-mix(in srgb, var(--border) 80%, transparent); border-radius: 24px; background: color-mix(in srgb, var(--surface) 76%,`
- `18: .state h1, .state h2 { margin: 0; color: var(--text-primary); }`
- `19: .state p { max-width: 480px; margin: 0; color: var(--text-secondary); line-height: 1.7; }`
- `20: .retry { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; color: white; text-decoration: none; border-radius: 13px; background: var(--primary); transition: transform 160ms cubic-bezier(.23,1,.32,1); }`
- `21: .retry:active { transform: scale(.97); }`
- `23: @media (prefers-reduced-motion: reduce) { .card, .retry { transition: none; } .card:hover, .card:active, .retry:active { transform: none; } }`
### payment_insurance_relevance
- `10: .card { display: flex; align-items: center; gap: 14px; min-height: 82px; padding: 16px; color: inherit; text-decoration: none; border: 1px solid color-mix(in srgb, var(--border) 65%, transparent); border-radius: 22px; background: color-mix(`
- `11: .card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); box-shadow: 0 18px 42px rgba(36,72,93,.12); }`
- `12: .card:active { transform: scale(.985); }`
- `13: .cardIcon { display: grid; place-items: center; width: 48px; height: 48px; flex: 0 0 auto; border-radius: 16px; }`
- `14: .cardCopy { display: flex; flex: 1; flex-direction: column; gap: 4px; min-width: 0; }`
- `15: .cardCopy strong { overflow: hidden; color: var(--text-primary); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }`
- `16: .cardCopy small { color: var(--text-tertiary); font-size: 12px; }`
- `23: @media (prefers-reduced-motion: reduce) { .card, .retry { transition: none; } .card:hover, .card:active, .retry:active { transform: none; } }`
### error_empty_loading_retry_cancel
- `20: .retry { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; color: white; text-decoration: none; border-radius: 13px; background: var(--primary); transition: transform 160ms cubic-bezier(.23,1,.32,1); }`
- `21: .retry:active { transform: scale(.97); }`
- `23: @media (prefers-reduced-motion: reduce) { .card, .retry { transition: none; } .card:hover, .card:active, .retry:active { transform: none; } }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
