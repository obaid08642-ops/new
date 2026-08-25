# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/login-form.module.css`
- **Member SHA-256:** `fd5893f424d3d51fc4212b61dfcee1aa19189f550f2a87665ed3874b1ba937aa`
- **Line count:** 93
- **Read range:** `1-93`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `39: .submit {`
- `59: .submit:hover:not(:disabled) {`
- `66: .submit:active:not(:disabled) { transform: scale(.985); }`
- `67: .submit:focus-visible { outline: 3px solid rgba(37,99,235,.56); outline-offset: 3px; }`
- `68: .submit:disabled { cursor: wait; opacity: .66; }`
- `90: .field input, .submit, .modeSwitch { transition: none; }`
- `91: .submit:active:not(:disabled) { transform: none; }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `73: .error {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `73: .error {`
- `86: .spinner { animation: spin .8s linear infinite; }`
- `92: .spinner { animation: none; }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
