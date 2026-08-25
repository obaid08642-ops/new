# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/pagination.tsx`
- **Member SHA-256:** `8f0d822b4688eb131e37fbf2330e19b269ab6487583be3249b98f3b68bb07928`
- **Line count:** 127
- **Read range:** `1-127`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `53: aria-current={isActive ? "page" : undefined}`
- `74: aria-label="Go to previous page"`
- `91: aria-label="Go to next page"`
- `114: <span className="sr-only">More pages</span>`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `14: role="navigation"`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
