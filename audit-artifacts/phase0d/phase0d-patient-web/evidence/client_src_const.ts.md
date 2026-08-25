# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/const.ts`
- **Member SHA-256:** `d7cdbd188f13aa1449030f34b529aa49dc28e62a44a8ddc8029f24e9afe1e9c4`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: // Start the Manus OAuth login. Call this from an event handler or effect at the`
- `6: // moment you want to navigate, e.g. `onClick={() => startLogin()}`.`
- `10: // `state` it sends. Do NOT call it during render (no `href={startLogin()}` /`
- `11: // `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase`
- `12: // call would desync it from an in-flight login and the callback would reject it`
- `15: export const startLogin = () => {`
### backend_consumers_or_contracts
- `18: const redirectUri = `${window.location.origin}/api/oauth/callback`;`
### auth_ownership
- `1: import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";`
- `3: export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";`
- `5: // Start the Manus OAuth login. Call this from an event handler or effect at the`
- `6: // moment you want to navigate, e.g. `onClick={() => startLogin()}`.`
- `9: // cookie, and navigates immediately — so the cookie nonce always matches the`
- `10: // `state` it sends. Do NOT call it during render (no `href={startLogin()}` /`
- `11: // `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase`
- `12: // call would desync it from an in-flight login and the callback would reject it`
- `15: export const startLogin = () => {`
- `21: document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;`
### state_transitions
- `1: import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";`
- `8: // It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state`
- `10: // `state` it sends. Do NOT call it during render (no `href={startLogin()}` /`
- `13: // with "invalid oauth state". It returns void by design, so there is no URL to`
- `21: document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;`
- `22: const state = encodeOAuthState({ redirectUri, nonce });`
- `27: url.searchParams.set("state", state);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
