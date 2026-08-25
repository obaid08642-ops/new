# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/__tests__/auth/SessionManager.test.ts`
- **Member SHA-256:** `55743efcf677eb7e07f1886db09b71e4600f95e8968e1437ffcc94a30d8d4ce1`
- **Line count:** 73
- **Read range:** `1-73`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `57: it('should force logout on outdated session version', async () => {`
- `66: it('should revoke session on admin forced logout', async () => {`
- `68: await sessionManager.forceLogoutFromAdmin('suspicious activity');`
### backend_consumers_or_contracts
- `1: import { SessionManager, SessionData } from '../../../src/core/platform/auth/SessionManager';`
### auth_ownership
- `1: import { SessionManager, SessionData } from '../../../src/core/platform/auth/SessionManager';`
- `3: describe('SessionManager', () => {`
- `4: let sessionManager: SessionManager;`
- `7: const mockSession: SessionData = {`
- `8: sessionId: 's1',`
- `10: accessToken: 'old-access',`
- `11: refreshToken: 'old-refresh',`
- `13: sessionVersion: 1,`
- `24: sessionManager = new SessionManager(mockSecureStorage);`
- `27: it('should create and retrieve a session', async () => {`
- `28: await sessionManager.createSession(mockSession);`
- `29: const session = await sessionManager.getSession();`
### state_transitions
- `51: it('should validate session version successfully', async () => {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
