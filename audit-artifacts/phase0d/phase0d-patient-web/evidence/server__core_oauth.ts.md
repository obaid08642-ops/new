# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/oauth.ts`
- **Member SHA-256:** `310791a577a40e7920f2ac449f730e4a27ce452c7f6a932834260943be469826`
- **Line count:** 65
- **Read range:** `1-65`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: export function registerOAuthRoutes(app: Express) {`
- `24: // startLogin set in the browser that began this login. An attacker can`
- `47: loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,`
### backend_consumers_or_contracts
- `14: app.get("/api/oauth/callback", async (req: Request, res: Response) => {`
### auth_ownership
- `1: import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";`
- `2: import { parse as parseCookieHeader } from "cookie";`
- `5: import { getSessionCookieOptions } from "./cookies";`
- `23: // CSRF guard: the nonce in `state` must match the one-time cookie that`
- `24: // startLogin set in the browser that began this login. An attacker can`
- `25: // forge `state`, but cannot plant this cookie in the victim's browser.`
- `27: const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];`
- `32: res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });`
- `35: const tokenResponse = await sdk.exchangeCodeForToken(code, state);`
- `36: const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);`
- `47: loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,`
- `51: const sessionToken = await sdk.createSessionToken(userInfo.openId, {`
### state_transitions
- `1: import { COOKIE_NAME, ONE_YEAR_MS, OAUTH_STATE_COOKIE, decodeOAuthState } from "@shared/const";`
- `16: const state = getQueryParam(req, "state");`
- `18: if (!code || !state) {`
- `19: res.status(400).json({ error: "code and state are required" });`
- `23: // CSRF guard: the nonce in `state` must match the one-time cookie that`
- `25: // forge `state`, but cannot plant this cookie in the victim's browser.`
- `26: const { nonce } = decodeOAuthState(state);`
- `27: const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];`
- `29: res.status(403).json({ error: "invalid oauth state" });`
- `32: res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });`
- `35: const tokenResponse = await sdk.exchangeCodeForToken(code, state);`
- `39: res.status(400).json({ error: "openId missing from user info" });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `19: res.status(400).json({ error: "code and state are required" });`
- `29: res.status(403).json({ error: "invalid oauth state" });`
- `39: res.status(400).json({ error: "openId missing from user info" });`
- `60: } catch (error) {`
- `61: console.error("[OAuth] Callback failed", error);`
- `62: res.status(500).json({ error: "OAuth callback failed" });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
