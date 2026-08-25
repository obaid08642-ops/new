# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/SessionManager.ts`
- **Member SHA-256:** `19aa77f627dd9157db9bc93210d9b0864e0da2159b38743d3ae3fe7032713bb3`
- **Line count:** 134
- **Read range:** `1-134`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `71: this.log.warn('Absolute session lifetime expired. Forcing logout.');`
- `119: * Forced Logout triggered remotely by an admin action.`
- `121: public async forceLogoutFromAdmin(reason: string): Promise<void> {`
- `122: this.log.warn(`Forced logout from Admin. Reason: ${reason}`);`
- `127: * Revoke current session (Logout)`
### backend_consumers_or_contracts
- `77: const res = await fetch(`${BASE_URL}/auth/refresh`, {`
### auth_ownership
- `7: export interface SessionData {`
- `8: sessionId: string;`
- `10: accessToken: string;`
- `11: refreshToken: string;`
- `13: sessionVersion: number;`
- `18: export class SessionManager {`
- `19: private log = logger.scope('SessionManager');`
- `20: private currentSession: SessionData | null = null;`
- `21: private refreshPromise: Promise<SessionData> | null = null;`
- `24: private readonly SESSION_KEY = 'NABD_ACTIVE_SESSION';`
- `28: public async createSession(data: SessionData): Promise<void> {`
- `29: this.currentSession = data;`
### state_transitions
- `68: if (!this.currentSession) throw new Error('No active session to rotate');`
- `73: throw new Error('Absolute session expired');`
- `83: this.log.warn(`Token rotation rejected (${res.status}). Revoking session.`);`
- `85: throw new Error('refresh_token_rejected');`
- `90: throw new Error('refresh_response_invalid');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `68: if (!this.currentSession) throw new Error('No active session to rotate');`
- `73: throw new Error('Absolute session expired');`
- `85: throw new Error('refresh_token_rejected');`
- `90: throw new Error('refresh_response_invalid');`
- `100: try { await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, data.accessToken); } catch { /* token mirror for apiFetch */ }`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
