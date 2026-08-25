# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/themeSlice.ts`
- **Member SHA-256:** `c97ae81035d66fafcdac3f572ac28660ff5f38179506db290e0e9bcb19cc36ea`
- **Line count:** 21
- **Read range:** `1-21`
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
- `3: interface ThemeState {`
- `10: initialState: { mode: 'system', language: 'ar' } as ThemeState,`
- `12: setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {`
- `13: state.mode = action.payload;`
- `15: setLanguage: (state, action: PayloadAction<'ar' | 'en'>) => {`
- `16: state.language = action.payload;`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
- `12: setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {`
- `13: state.mode = action.payload;`
- `15: setLanguage: (state, action: PayloadAction<'ar' | 'en'>) => {`
- `16: state.language = action.payload;`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
