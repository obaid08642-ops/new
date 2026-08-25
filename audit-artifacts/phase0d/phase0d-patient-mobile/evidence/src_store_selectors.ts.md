# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/selectors.ts`
- **Member SHA-256:** `31c4bb0731f82fcec8abb230bda6b3157369d1970a2d5383af8605c1060a7bb2`
- **Line count:** 34
- **Read range:** `1-34`
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
- `2: import type { RootState } from './index';`
- `9: // Basic State Selectors`
- `10: export const selectThemeState = (state: RootState) => state.theme;`
- `11: export const selectAuthState = (state: RootState) => state.auth;`
- `15: [selectThemeState],`
- `20: [selectAuthState],`
- `27: [selectThemeState, selectAuthState],`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
