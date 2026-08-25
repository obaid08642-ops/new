# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/auth/cookies.ts`
- **Member SHA-256:** `e88ca88ece7f0cadbaaf4ee343a5f7d171304e70f0321da3815667dc53d36490`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `3: export const authCookieNames = { access: "nabd_access", refresh: "nabd_refresh", device: "nabd_device" } as const;`
- `4: type TokenPair = { accessToken: string; refreshToken: string };`
- `5: const commonCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };`
- `6: export function setSessionCookies(response: NextResponse, tokens: TokenPair, deviceId: string) {`
- `7: response.cookies.set(authCookieNames.access, tokens.accessToken, { ...commonCookie, maxAge: 60 * 60 });`
- `8: response.cookies.set(authCookieNames.refresh, tokens.refreshToken, { ...commonCookie, maxAge: 60 * 60 * 24 * 14 });`
- `9: response.cookies.set(authCookieNames.device, deviceId, { ...commonCookie, maxAge: 60 * 60 * 24 * 14 });`
- `11: export function clearSessionCookies(response: NextResponse) { for (const name of Object.values(authCookieNames)) response.cookies.set(name, "", { ...commonCookie, maxAge: 0 }); }`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
