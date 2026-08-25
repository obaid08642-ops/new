# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/orders/[orderId]/order-detail.module.css`
- **Member SHA-256:** `26207776f9441c3b46ae0ef7dd2f233cecb18041231c75e837bb377fdf40b01c`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { display: grid; gap: 1.25rem; padding: 1.5rem 0 4rem; }`
- `28: @media (max-width: 540px) { .page { gap: 1rem; padding-top: 1rem; } .grid { grid-template-columns: minmax(0, 1fr); } .heroIcon { display: none; } .detail { padding: 1rem; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `12: .status { display: inline-flex; max-inline-size: 100%; padding: .35rem .65rem; border: 1px solid rgba(8,127,140,.18); border-radius: var(--radius-full); color: var(--brand-deep); background: var(--brand-soft); font-size: .78rem; font-weight`
- `21: .state { display: grid; justify-items: center; gap: .75rem; padding: clamp(2rem, 7vw, 3.5rem) 1.25rem; border: 1px dashed rgba(8,127,140,.28); border-radius: var(--radius-xl); background: linear-gradient(145deg, rgba(255,255,255,.76), rgba(`
- `22: .state svg { color: var(--brand-deep); }`
- `23: .state h1, .state p { margin: 0; }`
- `24: .state h1 { color: var(--ink); font-size: 1.1rem; }`
- `25: .state p { max-inline-size: 38rem; line-height: 1.7; }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
