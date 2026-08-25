# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/sessionSlice.ts`
- **Member SHA-256:** `494d71ac196cd435ea976f591dd5c4d2ea310d650bb03ca5a4e88da6ce48b41a`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: interface SessionState extends AsyncEntityState<any> {`
- `8: const initialState: SessionState = {`
- `14: const sessionSlice = createSlice({`
- `15: name: 'session',`
- `23: export const { reset } = sessionSlice.actions;`
- `24: export default sessionSlice.reducer;`
### state_transitions
- `2: import { AsyncEntityState, LoadingState } from '../types';`
- `4: interface SessionState extends AsyncEntityState<any> {`
- `5: // Define module specific state here`
- `8: const initialState: SessionState = {`
- `10: loading: LoadingState.IDLE,`
- `11: error: null,`
- `16: initialState,`
- `18: reset: () => initialState,`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
### error_empty_loading_retry_cancel
- `2: import { AsyncEntityState, LoadingState } from '../types';`
- `10: loading: LoadingState.IDLE,`
- `11: error: null,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
