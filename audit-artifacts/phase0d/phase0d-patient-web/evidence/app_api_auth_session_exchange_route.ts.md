# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/session/exchange/route.ts`
- **Member SHA-256:** `706bd91b7402bce1e97a10eb73a60be32b95843389de2dc3cc98411fe995be3c`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `3: import { callPatientApi } from "@/lib/api/upstream";`
- `12: const upstream = await callPatientApi("/auth/session/exchange", { method: "POST", headers: { cookie, "x-device-id": request.headers.get("x-nabd-device-id") || crypto.randomUUID() } });`
- `20: .replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange")`
### auth_ownership
- `8: const incoming = request.headers.get("cookie") || "";`
- `9: const match = incoming.match(/(?:^|;\s*)nabd_otp_exchange=([^;]+)/);`
- `10: if (!match?.[1]) return NextResponse.json({ message: "otp_exchange_required" }, { status: 400 });`
- `11: const cookie = `nabd_otp_exchange=${match[1]}`;`
- `12: const upstream = await callPatientApi("/auth/session/exchange", { method: "POST", headers: { cookie, "x-device-id": request.headers.get("x-nabd-device-id") || crypto.randomUUID() } });`
- `14: if (!upstream.ok) return NextResponse.json(data || { message: "session_exchange_failed" }, { status: upstream.status });`
- `16: if (!parsed.success) return NextResponse.json({ message: "unexpected_session_response" }, { status: 502 });`
- `18: const setCookie = upstream.headers.get("set-cookie");`
- `19: if (setCookie) response.headers.set("set-cookie", setCookie`
- `20: .replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange")`
### state_transitions
- `10: if (!match?.[1]) return NextResponse.json({ message: "otp_exchange_required" }, { status: 400 });`
- `14: if (!upstream.ok) return NextResponse.json(data || { message: "session_exchange_failed" }, { status: upstream.status });`
- `16: if (!parsed.success) return NextResponse.json({ message: "unexpected_session_response" }, { status: 502 });`
- `17: const response = NextResponse.json(parsed.data, { status: upstream.status });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `13: const data = await upstream.json().catch(() => null);`
- `14: if (!upstream.ok) return NextResponse.json(data || { message: "session_exchange_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
