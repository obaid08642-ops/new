# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/otp/verify/route.ts`
- **Member SHA-256:** `a73d7369746a17ee00dee84d9821212afbb2bd73a6ccaa79fa068d41a3857a39`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: import { callPatientApi } from "@/lib/api/upstream";`
- `10: const upstream = await callPatientApi("/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `17: if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));`
### auth_ownership
- `9: if (!input.success) return NextResponse.json({ message: "invalid_otp_verify" }, { status: 400 });`
- `10: const upstream = await callPatientApi("/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `12: if (!upstream.ok) return NextResponse.json(data || { message: "otp_verify_failed" }, { status: upstream.status });`
- `14: if (!expires.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });`
- `16: const setCookie = upstream.headers.get("set-cookie");`
- `17: if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));`
### state_transitions
- `9: if (!input.success) return NextResponse.json({ message: "invalid_otp_verify" }, { status: 400 });`
- `12: if (!upstream.ok) return NextResponse.json(data || { message: "otp_verify_failed" }, { status: upstream.status });`
- `14: if (!expires.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });`
- `15: const response = NextResponse.json(expires.data, { status: upstream.status });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: const input = schema.safeParse(await request.json().catch(() => null));`
- `11: const data = await upstream.json().catch(() => null);`
- `12: if (!upstream.ok) return NextResponse.json(data || { message: "otp_verify_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
