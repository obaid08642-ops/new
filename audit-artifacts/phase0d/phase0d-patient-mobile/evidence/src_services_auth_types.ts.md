# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/auth/types.ts`
- **Member SHA-256:** `1809c52116f74978f1642d6e9a131776cd744575d5b9b25105f00158e951baed`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `24: login(credentials?: any): Promise<AuthResult>;`
- `25: logout(): Promise<void>;`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: role: 'user' | 'admin' | 'doctor' | 'pharmacist' | 'guest';`
- `10: export interface AuthSession {`
- `11: accessToken: string;`
- `12: refreshToken: string;`
- `18: session: AuthSession;`
- `24: login(credentials?: any): Promise<AuthResult>;`
- `25: logout(): Promise<void>;`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
