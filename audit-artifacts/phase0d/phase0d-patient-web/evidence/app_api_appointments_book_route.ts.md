# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/book/route.ts`
- **Member SHA-256:** `aed1f9332453b22910a7396339e60bf23c24161c373402fac126a48fbe1d9be4`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: const resultSchema = z.object({ booking_id: z.string().uuid(), status: z.enum(["pending_payment", "confirmed"]) });`
- `20: if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });`
- `24: const upstream = await callPatientApi("/unified-bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(deviceId ? { "x-device-id": deviceId } : {}) }, body: JSON.stringify(input.da`
- `26: if (!upstream.ok) return NextResponse.json(data || { message: "booking_failed" }, { status: upstream.status });`
- `28: if (!result.success) return NextResponse.json({ message: "unexpected_booking_response" }, { status: 502 });`
### backend_consumers_or_contracts
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `5: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `21: const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;`
- `22: if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `23: const deviceId = store.get(authCookieNames.device)?.value;`
- `24: const upstream = await callPatientApi("/unified-bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(deviceId ? { "x-device-id": deviceId } : {}) }, body: JSON.stringify(input.da`
### state_transitions
- `14: const resultSchema = z.object({ booking_id: z.string().uuid(), status: z.enum(["pending_payment", "confirmed"]) });`
- `18: if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });`
- `20: if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });`
- `22: if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `26: if (!upstream.ok) return NextResponse.json(data || { message: "booking_failed" }, { status: upstream.status });`
- `28: if (!result.success) return NextResponse.json({ message: "unexpected_booking_response" }, { status: 502 });`
- `29: return NextResponse.json(result.data, { status: upstream.status, headers: { "cache-control": "no-store" } });`
### payment_insurance_relevance
- `12: payment_method_id: z.string().trim().min(1).max(200).optional(),`
- `14: const resultSchema = z.object({ booking_id: z.string().uuid(), status: z.enum(["pending_payment", "confirmed"]) });`
- `20: if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });`
### error_empty_loading_retry_cancel
- `14: const resultSchema = z.object({ booking_id: z.string().uuid(), status: z.enum(["pending_payment", "confirmed"]) });`
- `19: const input = bodySchema.safeParse(await request.json().catch(() => null));`
- `25: const data = await upstream.json().catch(() => null);`
- `26: if (!upstream.ok) return NextResponse.json(data || { message: "booking_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
