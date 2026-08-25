# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/appointment-actions.module.css`
- **Member SHA-256:** `a77ee63279a195f6a6c9f77f0508d35e01c4ba4bf6757989f390898a40cac17e`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: .cancel,.secondary { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-block-size:2.8rem; padding:.65rem .9rem; border-radius:var(--radius-md); font:inherit; font-weight:740; cursor:pointer; transition:transfo`
- `4: .cancel { border:0; color:#fff; background:#a33a36; }`
- `6: .cancel:hover:not(:disabled),.secondary:hover:not(:disabled) { transform:translateY(-1px); }`
- `7: .cancel:disabled,.secondary:disabled { cursor:not-allowed; opacity:.55; }`
- `17: @media (prefers-reduced-motion:reduce) { .cancel,.secondary { transition:none; } .cancel:hover:not(:disabled),.secondary:hover:not(:disabled) { transform:none; } .spinner { animation:none; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: .cancel,.secondary { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-block-size:2.8rem; padding:.65rem .9rem; border-radius:var(--radius-md); font:inherit; font-weight:740; cursor:pointer; transition:transfo`
- `4: .cancel { border:0; color:#fff; background:#a33a36; }`
- `6: .cancel:hover:not(:disabled),.secondary:hover:not(:disabled) { transform:translateY(-1px); }`
- `7: .cancel:disabled,.secondary:disabled { cursor:not-allowed; opacity:.55; }`
- `14: .error { padding:.65rem .75rem; border-inline-start:3px solid var(--danger); border-radius:var(--radius-md); color:#8d1a13!important; background:var(--color-danger-surface); }`
- `17: @media (prefers-reduced-motion:reduce) { .cancel,.secondary { transition:none; } .cancel:hover:not(:disabled),.secondary:hover:not(:disabled) { transform:none; } .spinner { animation:none; } }`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: .cancel,.secondary { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; min-block-size:2.8rem; padding:.65rem .9rem; border-radius:var(--radius-md); font:inherit; font-weight:740; cursor:pointer; transition:transfo`
- `4: .cancel { border:0; color:#fff; background:#a33a36; }`
- `6: .cancel:hover:not(:disabled),.secondary:hover:not(:disabled) { transform:translateY(-1px); }`
- `7: .cancel:disabled,.secondary:disabled { cursor:not-allowed; opacity:.55; }`
- `14: .error { padding:.65rem .75rem; border-inline-start:3px solid var(--danger); border-radius:var(--radius-md); color:#8d1a13!important; background:var(--color-danger-surface); }`
- `15: .spinner { animation:spin .8s linear infinite; }`
- `17: @media (prefers-reduced-motion:reduce) { .cancel,.secondary { transition:none; } .cancel:hover:not(:disabled),.secondary:hover:not(:disabled) { transform:none; } .spinner { animation:none; } }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
