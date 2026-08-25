# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/navigation/index.ts`
- **Member SHA-256:** `3bea7fd163e961ecd961a137436a78d83d0d1a179f548d57c499a62d29e22909`
- **Line count:** 4
- **Read range:** `1-4`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: export * from './RouterConfig';`
### backend_consumers_or_contracts
- `3: export * from './guards/AuthGuard';`
### auth_ownership
- `4: export * from './guards/AdminGuard';`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
