# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/payment-intent/route.ts`
- **Member SHA-256:** `1d3c4e430410d99ebb940aa5714c7ff6b89da2e953d5f8eef392a0901dd8adae`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `5: import { createPatientPaymentIntent } from "@/lib/api/payments-server";`
- `6: import { parsePaymentIntent } from "@/lib/api/payments";`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `4: import { authCookieNames } from "@/lib/auth/cookies";`
- `16: const store = await cookies(); const token = store.get(authCookieNames.access)?.value;`
- `17: if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `18: const upstream = createPatientPaymentIntent(token, "consultation", appointmentId, key);`
### state_transitions
- `13: if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });`
- `15: if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });`
- `17: if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });`
- `19: if (!upstream) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });`
- `21: if (!result.ok) return NextResponse.json(data || { message: "payment_intent_failed" }, { status: result.status });`
- `23: if (!parsed) return NextResponse.json({ message: "unexpected_payment_intent_response" }, { status: 502 });`
- `24: return NextResponse.json(parsed, { status: result.status, headers: { "cache-control": "no-store" } });`
### payment_insurance_relevance
- `5: import { createPatientPaymentIntent } from "@/lib/api/payments-server";`
- `6: import { parsePaymentIntent } from "@/lib/api/payments";`
- `18: const upstream = createPatientPaymentIntent(token, "consultation", appointmentId, key);`
- `21: if (!result.ok) return NextResponse.json(data || { message: "payment_intent_failed" }, { status: result.status });`
- `22: const parsed = parsePaymentIntent(data);`
- `23: if (!parsed) return NextResponse.json({ message: "unexpected_payment_intent_response" }, { status: 502 });`
### error_empty_loading_retry_cancel
- `20: const result = await upstream; const data = await result.json().catch(() => null);`
- `21: if (!result.ok) return NextResponse.json(data || { message: "payment_intent_failed" }, { status: result.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
