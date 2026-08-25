# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/verify-2fa/route.ts`
- **Member SHA-256:** `faeeec6c565cd6a9f7ab29e134b5b46df5e6628f7ae55957f2c928731e96e59d`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
### backend_consumers_or_contracts
- `3: import { setSessionCookies } from "@/lib/auth/cookies";`
- `4: import { callPatientApi } from "@/lib/api/upstream";`
- `11: const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
### auth_ownership
- `3: import { setSessionCookies } from "@/lib/auth/cookies";`
- `7: function tokenPair(data: unknown) { const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data); return parsed.success ? parsed.data.token : null; }`
- `11: const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `14: const tokens = tokenPair(data);`
- `15: if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });`
- `17: setSessionCookies(response, tokens, request.headers.get("x-nabd-device-id") || crypto.randomUUID());`
### state_transitions
- `7: function tokenPair(data: unknown) { const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data); return parsed.success ? parsed.data.token : null; }`
- `10: if (!input.success) return NextResponse.json({ message: "invalid_2fa_payload" }, { status: 400 });`
- `13: if (!upstream.ok) return NextResponse.json(data || { message: "verification_failed" }, { status: upstream.status });`
- `15: if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });`
### payment_insurance_relevance
- `10: if (!input.success) return NextResponse.json({ message: "invalid_2fa_payload" }, { status: 400 });`
### error_empty_loading_retry_cancel
- `9: const input = schema.safeParse(await request.json().catch(() => null));`
- `12: const data = await upstream.json().catch(() => null);`
- `13: if (!upstream.ok) return NextResponse.json(data || { message: "verification_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
