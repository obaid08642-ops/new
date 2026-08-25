# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/otp/request/route.ts`
- **Member SHA-256:** `7f22bc2ae4965fa8021006597349b701c02bae5d71a2ca3824f29315f51c812e`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: import { callPatientApi } from "@/lib/api/upstream";`
- `10: const upstream = await callPatientApi("/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
### auth_ownership
- `9: if (!input.success) return NextResponse.json({ message: "invalid_otp_request" }, { status: 400 });`
- `10: const upstream = await callPatientApi("/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `12: return NextResponse.json(data || { message: "otp_request_failed" }, { status: upstream.status });`
### state_transitions
- `9: if (!input.success) return NextResponse.json({ message: "invalid_otp_request" }, { status: 400 });`
- `12: return NextResponse.json(data || { message: "otp_request_failed" }, { status: upstream.status });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: const input = schema.safeParse(await request.json().catch(() => null));`
- `11: const data = await upstream.json().catch(() => null);`
- `12: return NextResponse.json(data || { message: "otp_request_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
