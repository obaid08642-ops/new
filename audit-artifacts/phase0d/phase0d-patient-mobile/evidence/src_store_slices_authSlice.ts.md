# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/slices/authSlice.ts`
- **Member SHA-256:** `9253c4ff0e0fd2203ded45d4b29c61f374fb15740684fbd1792d1f0d2b725ebc`
- **Line count:** 183
- **Read range:** `1-183`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: // and login attempt tracking (rate limiting).`
- `17: loginAttempts: number;`
- `33: loginAttempts: 0,`
- `40: const MAX_LOGIN_ATTEMPTS = 5;`
- `51: loginSuccess: (`
- `71: state.loginAttempts = 0;`
- `76: guestLogin: (`
- `117: logout: (state) => {`
- `143: incrementLoginAttempts: (state) => {`
- `144: state.loginAttempts += 1;`
- `145: if (state.loginAttempts >= MAX_LOGIN_ATTEMPTS) {`
- `150: resetLoginAttempts: (state) => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: // Auth state – supports session persistence, guest mode, token refresh,`
- `6: // and login attempt tracking (rate limiting).`
- `10: token: string | null;`
- `11: refreshToken: string | null;`
- `12: tokenExpiry: number | null;`
- `17: loginAttempts: number;`
- `21: sessionStartedAt: number | null;`
- `26: token: null,`
- `27: refreshToken: null,`
- `28: tokenExpiry: null,`
- `33: loginAttempts: 0,`
- `37: sessionStartedAt: null,`
### state_transitions
- `5: // Auth state – supports session persistence, guest mode, token refresh,`
- `8: interface AuthState {`
- `15: isLoading: boolean;`
- `16: error: string | null;`
- `24: const initialState: AuthState = {`
- `31: isLoading: false,`
- `32: error: null,`
- `45: initialState,`
- `47: setLoading: (state, action: PayloadAction<boolean>) => {`
- `48: state.isLoading = action.payload;`
- `51: loginSuccess: (`
- `52: state,`
### payment_insurance_relevance
- `1: import { createSlice, PayloadAction } from '@reduxjs/toolkit';`
- `47: setLoading: (state, action: PayloadAction<boolean>) => {`
- `48: state.isLoading = action.payload;`
- `53: action: PayloadAction<{`
- `60: const { user, token, refreshToken, expiresIn } = action.payload;`
- `78: action: PayloadAction<{ user: User; token: string }>,`
- `80: state.user = action.payload.user;`
- `81: state.token = action.payload.token;`
- `102: action: PayloadAction<{`
- `108: state.token = action.payload.token;`
- `109: if (action.payload.refreshToken) {`
- `110: state.refreshToken = action.payload.refreshToken;`
### error_empty_loading_retry_cancel
- `15: isLoading: boolean;`
- `16: error: string | null;`
- `31: isLoading: false,`
- `32: error: null,`
- `47: setLoading: (state, action: PayloadAction<boolean>) => {`
- `48: state.isLoading = action.payload;`
- `69: state.isLoading = false;`
- `70: state.error = null;`
- `84: state.isLoading = false;`
- `88: offlineUnauthenticated: (state) => {`
- `95: state.isLoading = false;`
- `96: state.error = 'offline_unauthenticated';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
