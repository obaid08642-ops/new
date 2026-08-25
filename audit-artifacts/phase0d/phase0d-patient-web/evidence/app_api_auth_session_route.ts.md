# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/session/route.ts`
- **Member SHA-256:** `50932d1d96dc6fc6b561e5f465b92f56f7b85dffb67e45a714e080eefdc96ba2`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: import { authCookieNames } from "@/lib/auth/cookies";`
- `4: import { callPatientApi } from "@/lib/api/upstream";`
- `5: export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPatientApi("/auth/me", { method: "`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `3: import { authCookieNames } from "@/lib/auth/cookies";`
- `5: export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPatientApi("/auth/me", { method: "`
### state_transitions
- `5: export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPatientApi("/auth/me", { method: "`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
