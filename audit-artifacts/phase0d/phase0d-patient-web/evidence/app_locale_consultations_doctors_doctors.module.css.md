# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/consultations/doctors/doctors.module.css`
- **Member SHA-256:** `10e1f58bbde1aac3efb84517e148a3e908dedb8dedcc29e7c6982de25430859b`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: .page { max-width: 980px; margin: 0 auto; padding: 32px 20px 72px; }.hero { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:28px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border`
- `2: @media(max-width:700px){.page{padding:24px 14px 56px}.hero,.detail{align-items:flex-start;padding:22px}.grid{grid-template-columns:1fr}.search{padding-left:14px}.search button{padding:10px 12px}}`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: .page { max-width: 980px; margin: 0 auto; padding: 32px 20px 72px; }.hero { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:28px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border`
### state_transitions
- `1: .page { max-width: 980px; margin: 0 auto; padding: 32px 20px 72px; }.hero { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:28px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border`
### payment_insurance_relevance
- `1: .page { max-width: 980px; margin: 0 auto; padding: 32px 20px 72px; }.hero { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:28px; border:1px solid color-mix(in srgb,var(--border) 70%,transparent); border`
- `3: @media(prefers-reduced-motion:reduce){.card{transition:none}.card:hover,.card:active{transform:none}}`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
