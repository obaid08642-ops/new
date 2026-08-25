# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/reschedule/route.ts`
- **Member SHA-256:** `532ca60ec3ea00e2cde670c8d6562248665fa19a93cfd4ce79be46e4d9e1f67a`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `17: if (!parsed.success) return NextResponse.json({ message: "invalid_reschedule_payload" }, { status: 400 });`
- `20: const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/reschedule`, { method: "PATCH", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(parsed.data) }, token);`
- `22: if (!upstream.ok) return NextResponse.json(data || { message: "reschedule_failed" }, { status: upstream.status });`
### backend_consumers_or_contracts
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `5: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `18: const store = await cookies(); const token = store.get(authCookieNames.access)?.value;`
- `19: if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `20: const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/reschedule`, { method: "PATCH", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(parsed.data) }, token);`
### state_transitions
- `13: if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });`
- `15: if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });`
- `17: if (!parsed.success) return NextResponse.json({ message: "invalid_reschedule_payload" }, { status: 400 });`
- `19: if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `22: if (!upstream.ok) return NextResponse.json(data || { message: "reschedule_failed" }, { status: upstream.status });`
- `23: return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });`
### payment_insurance_relevance
- `17: if (!parsed.success) return NextResponse.json({ message: "invalid_reschedule_payload" }, { status: 400 });`
### error_empty_loading_retry_cancel
- `16: const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));`
- `21: const data = await upstream.json().catch(() => null);`
- `22: if (!upstream.ok) return NextResponse.json(data || { message: "reschedule_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
