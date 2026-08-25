# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/localizationSlice.ts`
- **Member SHA-256:** `8f6de44237a59e472549fd39b683536a00d1898d46baa4e15118fb71ffb0e6d0`
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
- No matching static signal found in this member.
### state_transitions
- `2: import { AsyncEntityState, LoadingState } from '../types';`
- `4: interface LocalizationState extends AsyncEntityState<any> {`
- `5: // Define module specific state here`
- `8: const initialState: LocalizationState = {`
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
