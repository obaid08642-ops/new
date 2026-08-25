# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/insurance/insurance.module.css`
- **Member SHA-256:** `96b7a9564333ffd06e7ee8367192c2b28f3f546340fa1698dbcd9ff98ea9a12a`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `25: @media (max-width: 440px) { .page { gap: 1rem; padding-top: 1rem; } .claimTop { align-items: flex-start; flex-direction: column; gap: .55rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `19: .status { inline-size: max-content; max-inline-size: 100%; border-radius: var(--radius-full); padding: .3rem .65rem; color: var(--brand-deep); background: var(--brand-soft); font-size: .8rem; font-weight: 760; overflow-wrap: anywhere; }`
- `21: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `22: .state p { margin: 0; line-height: 1.7; }`
### payment_insurance_relevance
- `9: .card { display: grid; gap: .65rem; min-inline-size: 0; padding: 1.2rem; border: 1px solid var(--line); border-radius: var(--radius-xl); background: rgba(255,255,255,.92); box-shadow: var(--shadow-md); }`
- `10: .card span { color: var(--muted); font-size: .84rem; font-weight: 700; }`
- `11: .card strong { color: var(--ink); font-size: 1.02rem; overflow-wrap: anywhere; }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
