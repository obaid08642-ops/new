# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/patient/[...path]/route.ts`
- **Member SHA-256:** `740115708afe90d926aa10b548683b7a5139dc146e069f26133e5f8cf36d269a`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: import { authCookieNames, clearSessionCookies, setSessionCookies } from "@/lib/auth/cookies";`
- `4: import { parseRefreshedTokens, refreshRequestBody } from "@/lib/auth/refresh";`
- `5: import { isAllowedPatientApiRequest } from "@/lib/api/patient-allowlist";`
- `6: import { forwardApiResponse } from "@/lib/api/response";`
- `7: import { callPatientApi } from "@/lib/api/upstream";`
- `9: async function refreshSession() { const store = await cookies(); const refreshToken = store.get(authCookieNames.refresh)?.value; const deviceId = store.get(authCookieNames.device)?.value; if (!refreshToken || !deviceId) return null; const r`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `3: import { authCookieNames, clearSessionCookies, setSessionCookies } from "@/lib/auth/cookies";`
- `4: import { parseRefreshedTokens, refreshRequestBody } from "@/lib/auth/refresh";`
- `9: async function refreshSession() { const store = await cookies(); const refreshToken = store.get(authCookieNames.refresh)?.value; const deviceId = store.get(authCookieNames.device)?.value; if (!refreshToken || !deviceId) return null; const r`
- `10: async function proxy(request: NextRequest, context: Context) { const { path: parts } = await context.params; const path = `/${parts.map(encodeURIComponent).join("/")}`; if (!isAllowedPatientApiRequest(path, request.method)) return NextRespo`
### state_transitions
- `10: async function proxy(request: NextRequest, context: Context) { const { path: parts } = await context.params; const path = `/${parts.map(encodeURIComponent).join("/")}`; if (!isAllowedPatientApiRequest(path, request.method)) return NextRespo`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: async function refreshSession() { const store = await cookies(); const refreshToken = store.get(authCookieNames.refresh)?.value; const deviceId = store.get(authCookieNames.device)?.value; if (!refreshToken || !deviceId) return null; const r`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
