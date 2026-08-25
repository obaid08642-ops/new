# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `shared/const.ts`
- **Member SHA-256:** `30a4b7bfc3369a0f98f4af263dbf8ec5c6fee95cebe8922e347eeb03ab5afccc`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: export const UNAUTHED_ERR_MSG = 'Please login (10001)';`
- `7: // One-time nonce cookie that binds an OAuth login to the browser that started`
### backend_consumers_or_contracts
- `3: export const AXIOS_TIMEOUT_MS = 30_000;`
### auth_ownership
- `1: export const COOKIE_NAME = "app_session_id";`
- `4: export const UNAUTHED_ERR_MSG = 'Please login (10001)';`
- `5: export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';`
- `7: // One-time nonce cookie that binds an OAuth login to the browser that started`
- `8: // it. The `__Host-` prefix forces the cookie host-only (Secure, Path=/, no`
- `11: export const OAUTH_STATE_COOKIE = "__Host-oauth_state";`
- `13: // `state` carries the callback redirect URI (used at token exchange) plus the`
- `14: // CSRF nonce. Defined here so the client encoder and server decoder never drift.`
- `26: // callback's CSRF guard rejects it with 403 — never throw, since the caller`
### state_transitions
- `11: export const OAUTH_STATE_COOKIE = "__Host-oauth_state";`
- `13: // `state` carries the callback redirect URI (used at token exchange) plus the`
- `15: export type OAuthState = { redirectUri: string; nonce?: string };`
- `17: export const encodeOAuthState = (state: OAuthState): string =>`
- `18: btoa(JSON.stringify(state));`
- `20: export const decodeOAuthState = (state: string): OAuthState => {`
- `23: decoded = atob(state);`
- `34: // Legacy links: `state` was a bare base64(redirectUri) with no nonce.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: export const AXIOS_TIMEOUT_MS = 30_000;`
- `24: } catch {`
- `27: // runs outside the request handler's try/catch.`
- `33: } catch {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
