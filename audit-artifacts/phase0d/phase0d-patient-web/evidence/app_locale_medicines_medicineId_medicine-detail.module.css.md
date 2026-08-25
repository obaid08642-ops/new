# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/medicines/[medicineId]/medicine-detail.module.css`
- **Member SHA-256:** `b1cf0b639e0801ccc89d73da3c947e96e3e0a0cc744ef39db1c105f9fbae0a4e`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `27: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .grid { grid-template-columns: minmax(0, 1fr); } .heroIcon { display: none; } .detail { padding: 1rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `20: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `21: .state svg { color: var(--brand-deep); }`
- `22: .state h1, .state p { margin: 0; }`
- `23: .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `24: .state p { max-inline-size: 38rem; line-height: 1.7; }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
