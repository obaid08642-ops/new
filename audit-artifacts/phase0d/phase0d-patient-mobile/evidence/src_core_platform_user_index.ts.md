# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/user/index.ts`
- **Member SHA-256:** `4e3c0667de8e6e459adaa9999061549aac4d14341ae8245bad6a4bed74d3a6b2`
- **Line count:** 2
- **Read range:** `1-2`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: export * from './RoleManager';`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
