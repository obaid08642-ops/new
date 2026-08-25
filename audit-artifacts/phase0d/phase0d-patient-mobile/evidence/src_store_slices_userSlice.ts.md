# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/userSlice.ts`
- **Member SHA-256:** `d5df211e8b453dae74a80d1d043c06e1b93e38d5970475d5f90e989109cc3cf0`
- **Line count:** 51
- **Read range:** `1-51`
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
- `3: import { LoadingState } from '../types';`
- `14: const initialState = usersAdapter.getInitialState({`
- `15: loading: LoadingState.IDLE,`
- `16: error: null as string | null,`
- `21: initialState,`
- `23: usersLoading: (state) => {`
- `24: state.loading = LoadingState.PENDING;`
- `26: usersReceived: (state, action: PayloadAction<User[]>) => {`
- `27: state.loading = LoadingState.SUCCEEDED;`
- `28: usersAdapter.setAll(state, action.payload);`
- `33: usersFailed: (state, action: PayloadAction<string>) => {`
- `34: state.loading = LoadingState.FAILED;`
### payment_insurance_relevance
- `1: import { createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit';`
- `26: usersReceived: (state, action: PayloadAction<User[]>) => {`
- `28: usersAdapter.setAll(state, action.payload);`
- `33: usersFailed: (state, action: PayloadAction<string>) => {`
- `35: state.error = action.payload;`
### error_empty_loading_retry_cancel
- `3: import { LoadingState } from '../types';`
- `15: loading: LoadingState.IDLE,`
- `16: error: null as string | null,`
- `23: usersLoading: (state) => {`
- `24: state.loading = LoadingState.PENDING;`
- `27: state.loading = LoadingState.SUCCEEDED;`
- `33: usersFailed: (state, action: PayloadAction<string>) => {`
- `34: state.loading = LoadingState.FAILED;`
- `35: state.error = action.payload;`
- `42: usersLoading,`
- `47: usersFailed,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
