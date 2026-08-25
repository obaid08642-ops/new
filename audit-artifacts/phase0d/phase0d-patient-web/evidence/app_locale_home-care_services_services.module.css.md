# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/home-care/services/services.module.css`
- **Member SHA-256:** `957ea028ca6fb129dfcc481788ff8bdf84a4726fbd1b0678db947bbfd955c371`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { max-width: 980px; margin: 0 auto; padding: 32px 20px 72px; }`
- `24: @media (max-width:700px){.page{padding:24px 14px 56px}.hero{align-items:flex-start;padding:22px}.grid{grid-template-columns:1fr}}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `19: .state { display:grid; justify-items:center; gap:12px; padding:72px 24px; text-align:center; border:1px dashed color-mix(in srgb, var(--border) 80%, transparent); border-radius:24px; background:color-mix(in srgb, var(--surface) 76%, transpa`
- `20: .state h1, .state h2 { margin:0; color:var(--text-primary); }.state p { max-width:480px; margin:0; color:var(--text-secondary); line-height:1.7; }`
### payment_insurance_relevance
- `11: .card { display:flex; align-items:center; gap:14px; min-height:88px; padding:16px; color:inherit; text-decoration:none; border:1px solid color-mix(in srgb, var(--border) 65%, transparent); border-radius:22px; background:color-mix(in srgb, v`
- `12: .card:hover { transform:translateY(-3px); border-color:color-mix(in srgb, var(--primary) 45%, var(--border)); box-shadow:0 18px 42px rgba(36,72,93,.12); }`
- `13: .card:active { transform:scale(.985); }`
- `14: .card:focus-visible, .back:focus-visible, .action:focus-visible { outline:3px solid rgba(37,99,235,.56); outline-offset:3px; }`
- `25: @media (prefers-reduced-motion:reduce){.card,.action{transition:none}.card:hover,.card:active{transform:none}}`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
