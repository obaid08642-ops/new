# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/AuthProviders.ts`
- **Member SHA-256:** `520bd1a5712af6bcdf86f5b088592dd198d2311330d7656edccf16f2eb221229`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: import { SessionData } from './SessionManager';`
- `4: token?: string; // For OAuth/Apple`
- `8: otp?: string;`
- `14: signIn(credentials: AuthCredentials): Promise<SessionData>;`
- `15: signUp(credentials: AuthCredentials): Promise<SessionData>;`
- `17: refreshToken(token: string): Promise<SessionData>;`
- `18: revokeSession(sessionId: string): Promise<void>;`
- `21: verifyOTP(identifier: string, code: string): Promise<boolean>;`
- `32: public async signIn(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }`
- `33: public async signUp(credentials: AuthCredentials): Promise<SessionData> { return {} as SessionData; }`
- `35: public async refreshToken(token: string): Promise<SessionData> { return {} as SessionData; }`
- `36: public async revokeSession(sessionId: string): Promise<void> {}`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
