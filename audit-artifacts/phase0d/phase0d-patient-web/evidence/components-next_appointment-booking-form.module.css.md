# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/appointment-booking-form.module.css`
- **Member SHA-256:** `71f2af97d79e25acbef5f95620dd9264ec69d92efd64c7da615988aad5fa28db`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: .slot:focus-visible, .slotSelected:focus-visible, .submit:focus-visible, .notes textarea:focus-visible { outline: 3px solid rgba(37,99,235,.46); outline-offset: 3px; }`
- `13: .submit { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-block-size: 3rem; border: 0; border-radius: var(--radius-md); color: #fff; background: linear-gradient(135deg, #0a8896, #05616b); box-shadow: 0 10`
- `14: .submit:hover:not(:disabled) { transform: translateY(-1px); }`
- `15: .submit:disabled { cursor: not-allowed; opacity: .55; }`
- `21: @media (prefers-reduced-motion: reduce) { .slot, .slotSelected, .submit { transition: none; } .slot:hover:not(:disabled), .submit:hover:not(:disabled) { transform: none; } .spinner { animation: none; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `16: .error { margin: 0; padding: .7rem .8rem; border-inline-start: 3px solid var(--danger); border-radius: var(--radius-md); color: #8d1a13; background: var(--color-danger-surface); font-size: .82rem; }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `16: .error { margin: 0; padding: .7rem .8rem; border-inline-start: 3px solid var(--danger); border-radius: var(--radius-md); color: #8d1a13; background: var(--color-danger-surface); font-size: .82rem; }`
- `18: .spinner { animation: spin .8s linear infinite; }`
- `21: @media (prefers-reduced-motion: reduce) { .slot, .slotSelected, .submit { transition: none; } .slot:hover:not(:disabled), .submit:hover:not(:disabled) { transform: none; } .spinner { animation: none; } }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
