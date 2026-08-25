# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/logout/route.ts`
- **Member SHA-256:** `2b50e082285f77b861be63f9f0ecaf0ee9695a42f813cf91d30e25a609e2215f`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ succe`
### backend_consumers_or_contracts
- `3: import { authCookieNames, clearSessionCookies } from "@/lib/auth/cookies";`
- `4: import { callPatientApi } from "@/lib/api/upstream";`
- `5: export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ succe`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `3: import { authCookieNames, clearSessionCookies } from "@/lib/auth/cookies";`
- `5: export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ succe`
### state_transitions
- `5: export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ succe`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const response = NextResponse.json({ succe`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
