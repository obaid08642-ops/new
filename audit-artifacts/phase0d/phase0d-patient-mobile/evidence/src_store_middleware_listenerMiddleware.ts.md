# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/middleware/listenerMiddleware.ts`
- **Member SHA-256:** `7ae9a61eeaedc6306f53cd995cd8ed7b93b0b5bf868f0be838beb6ab9f8e8482`
- **Line count:** 8
- **Read range:** `1-8`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import type { RootState, AppDispatch } from '../index';`
- `6: export type AppStartListening = TypedStartListening<RootState, AppDispatch>;`
- `8: export const addAppListener = addListener as TypedAddListener<RootState, AppDispatch>;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
