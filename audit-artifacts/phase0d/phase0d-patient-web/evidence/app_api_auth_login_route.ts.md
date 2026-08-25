# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/login/route.ts`
- **Member SHA-256:** `fc69d2fa63fcafc604b625ec855e844652f79f6c063a3ad22a49f072ff5d07de`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: const loginSchema = z.object({ identifier: z.string().trim().min(3).max(320), password: z.string().min(1).max(1024) });`
- `9: const input = loginSchema.safeParse(await request.json().catch(() => null));`
- `10: if (!input.success) return NextResponse.json({ message: "invalid_login_payload" }, { status: 400 });`
- `11: const upstream = await callPatientApi("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `13: if (!upstream.ok) return NextResponse.json(data || { message: "login_failed" }, { status: upstream.status });`
### backend_consumers_or_contracts
- `3: import { setSessionCookies } from "@/lib/auth/cookies";`
- `4: import { callPatientApi } from "@/lib/api/upstream";`
- `11: const upstream = await callPatientApi("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
### auth_ownership
- `3: import { setSessionCookies } from "@/lib/auth/cookies";`
- `6: const loginSchema = z.object({ identifier: z.string().trim().min(3).max(320), password: z.string().min(1).max(1024) });`
- `7: function tokenPair(data: unknown) { const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data); return parsed.success ? parsed.data.token : null; }`
- `9: const input = loginSchema.safeParse(await request.json().catch(() => null));`
- `10: if (!input.success) return NextResponse.json({ message: "invalid_login_payload" }, { status: 400 });`
- `11: const upstream = await callPatientApi("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `13: if (!upstream.ok) return NextResponse.json(data || { message: "login_failed" }, { status: upstream.status });`
- `15: const tokens = tokenPair(data);`
- `16: if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });`
- `18: setSessionCookies(response, tokens, request.headers.get("x-nabd-device-id") || crypto.randomUUID());`
### state_transitions
- `7: function tokenPair(data: unknown) { const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data); return parsed.success ? parsed.data.token : null; }`
- `10: if (!input.success) return NextResponse.json({ message: "invalid_login_payload" }, { status: 400 });`
- `13: if (!upstream.ok) return NextResponse.json(data || { message: "login_failed" }, { status: upstream.status });`
- `14: if (z.object({ requires_2fa: z.literal(true) }).safeParse(data).success) return NextResponse.json({ requires2fa: true }, { status: 200 });`
- `16: if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });`
### payment_insurance_relevance
- `10: if (!input.success) return NextResponse.json({ message: "invalid_login_payload" }, { status: 400 });`
### error_empty_loading_retry_cancel
- `9: const input = loginSchema.safeParse(await request.json().catch(() => null));`
- `12: const data = await upstream.json().catch(() => null);`
- `13: if (!upstream.ok) return NextResponse.json(data || { message: "login_failed" }, { status: upstream.status });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
