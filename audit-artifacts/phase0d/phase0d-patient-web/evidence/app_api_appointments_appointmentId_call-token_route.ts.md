# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/call-token/route.ts`
- **Member SHA-256:** `46bee85e27f1d8894e6c0a230d14fd3cbf2e7300b8b56e8595e4b464fba300c7`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: const upstream = await callPatientApi(`/unified-bookings/${appointmentId}/call-token`, { method: "GET" }, token);`
### backend_consumers_or_contracts
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `5: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `9: const tokenSchema = z.object({ provider: z.literal("livekit"), token: z.string().min(1).max(8192), room: z.string().min(1).max(255) }).strip();`
- `14: const store = await cookies(); const token = store.get(authCookieNames.access)?.value;`
- `15: if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `16: const upstream = await callPatientApi(`/unified-bookings/${appointmentId}/call-token`, { method: "GET" }, token);`
- `18: if (!upstream.ok) return NextResponse.json(data || { message: "call_token_unavailable" }, { status: upstream.status, headers: { "cache-control": "no-store" } });`
- `19: const parsed = tokenSchema.safeParse(data);`
- `20: if (!parsed.success) return NextResponse.json({ message: "invalid_call_token_response" }, { status: 502, headers: { "cache-control": "no-store" } });`
### state_transitions
- `13: if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });`
- `15: if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `18: if (!upstream.ok) return NextResponse.json(data || { message: "call_token_unavailable" }, { status: upstream.status, headers: { "cache-control": "no-store" } });`
- `20: if (!parsed.success) return NextResponse.json({ message: "invalid_call_token_response" }, { status: 502, headers: { "cache-control": "no-store" } });`
- `21: return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: const data = await upstream.json().catch(() => null);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
