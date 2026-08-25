# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase9-security-audit.txt`
- **Member SHA-256:** `abfd1069c56c477a42ba9f92db28987b939e5787c7a8e73da8f06fd964d5a527`
- **Line count:** 736
- **Read range:** `1-736`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: app/llms.txt/route.ts:28:      "X-Content-Type-Options": "nosniff"`
- `11: app/favicon.ico/route.ts:10:      "X-Content-Type-Options": "nosniff"`
- `12: app/[locale]/orders/[orderId]/tracking/page.tsx:36:        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>`
- `13: app/[locale]/orders/[orderId]/page.tsx:37:        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>`
- `14: app/api/appointments/[appointmentId]/call-token/route.ts:21:  return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });`
- `15: app/api/auth/otp/verify/route.ts:16:  const setCookie = upstream.headers.get("set-cookie");`
- `16: app/api/auth/otp/verify/route.ts:17:  if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));`
- `17: app/api/auth/session/exchange/route.ts:18:  const setCookie = upstream.headers.get("set-cookie");`
- `18: app/api/auth/session/exchange/route.ts:19:  if (setCookie) response.headers.set("set-cookie", setCookie`
- `22: === allowlist and BFF routes ===`
- `23: app/api/appointments/[appointmentId]/call-token/route.ts`
- `24: app/api/appointments/[appointmentId]/cancel/route.ts`
### backend_consumers_or_contracts
- `2: lib/auth/refresh.ts:6:  return JSON.stringify({ refresh_token: refreshToken });`
- `3: lib/api/upstream.ts:6:  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);`
- `10: lib/auth/cookies.ts:5:const commonCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };`
- `12: app/[locale]/orders/[orderId]/tracking/page.tsx:36:        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>`
- `13: app/[locale]/orders/[orderId]/page.tsx:37:        <div className={styles.item}><dt><Hash size={15} aria-hidden="true" />{t("secureId")}</dt><dd>{orderId}</dd></div>`
- `14: app/api/appointments/[appointmentId]/call-token/route.ts:21:  return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });`
- `15: app/api/auth/otp/verify/route.ts:16:  const setCookie = upstream.headers.get("set-cookie");`
- `16: app/api/auth/otp/verify/route.ts:17:  if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));`
- `17: app/api/auth/session/exchange/route.ts:18:  const setCookie = upstream.headers.get("set-cookie");`
- `18: app/api/auth/session/exchange/route.ts:19:  if (setCookie) response.headers.set("set-cookie", setCookie`
- `21: lib/api/upstream.ts:1:const API_BASE_URL = (process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1").replace(/\/$/, "");`
- `23: app/api/appointments/[appointmentId]/call-token/route.ts`
### auth_ownership
- `1: === browser token/storage candidates ===`
- `2: lib/auth/refresh.ts:6:  return JSON.stringify({ refresh_token: refreshToken });`
- `3: lib/api/upstream.ts:6:  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);`
- `4: === cookie/security headers ===`
- `8: next.config.ts:14:      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },`
- `10: lib/auth/cookies.ts:5:const commonCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };`
- `14: app/api/appointments/[appointmentId]/call-token/route.ts:21:  return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });`
- `15: app/api/auth/otp/verify/route.ts:16:  const setCookie = upstream.headers.get("set-cookie");`
- `16: app/api/auth/otp/verify/route.ts:17:  if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));`
- `17: app/api/auth/session/exchange/route.ts:18:  const setCookie = upstream.headers.get("set-cookie");`
- `18: app/api/auth/session/exchange/route.ts:19:  if (setCookie) response.headers.set("set-cookie", setCookie`
- `23: app/api/appointments/[appointmentId]/call-token/route.ts`
### state_transitions
- `14: app/api/appointments/[appointmentId]/call-token/route.ts:21:  return NextResponse.json(parsed.data, { status: 200, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });`
- `24: app/api/appointments/[appointmentId]/cancel/route.ts`
- `36: app/api/appointments/[appointmentId]/call-token/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `39: app/api/appointments/[appointmentId]/reschedule/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `42: app/api/appointments/[appointmentId]/cancel/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `43: app/api/appointments/[appointmentId]/cancel/route.ts:5:import { callPatientApi } from "@/lib/api/upstream";`
- `44: app/api/appointments/[appointmentId]/cancel/route.ts:20:  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": ke`
- `46: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:2:const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));`
- `47: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:3:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `48: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:10:  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : und`
- `49: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:15:    expect(state.callPatientApi).not.toHaveBeenCalled();`
- `50: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:18:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", clien`
### payment_insurance_relevance
- `8: next.config.ts:14:      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },`
- `25: app/api/appointments/[appointmentId]/payment-intent/route.ts`
- `46: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:2:const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));`
- `47: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:3:vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `48: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:10:  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : und`
- `49: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:15:    expect(state.callPatientApi).not.toHaveBeenCalled();`
- `50: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:18:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", clien`
- `51: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:21:    expect(state.callPatientApi).toHaveBeenCalledWith("/payments/intent/consultation/22222222-2222-4222-8222-222222222222", expect.objectContaining({ method: "POST", heade`
- `52: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:24:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "not_authorized" }), { status: 400 }));`
- `57: app/api/appointments/book/route.test.ts:24:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201`
- `96: lib/api/payments-server.ts:1:import { callPatientApi } from "@/lib/api/upstream";`
- `97: lib/api/payments-server.ts:6:  return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "idempotency-key": idempotencyKey } }, accessToken);`
### error_empty_loading_retry_cancel
- `24: app/api/appointments/[appointmentId]/cancel/route.ts`
- `42: app/api/appointments/[appointmentId]/cancel/route.test.ts:3:vi.mock("@/lib/api/upstream",()=>({callPatientApi:state.call})); vi.mock("next/headers",()=>({cookies:async()=>state.cookies}));`
- `43: app/api/appointments/[appointmentId]/cancel/route.ts:5:import { callPatientApi } from "@/lib/api/upstream";`
- `44: app/api/appointments/[appointmentId]/cancel/route.ts:20:  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": ke`
- `50: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:18:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", clien`
- `57: app/api/appointments/book/route.test.ts:24:    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201`
- `64: app/api/patient/[...path]/route.ts:9:async function refreshSession() { const store = await cookies(); const refreshToken = store.get(authCookieNames.refresh)?.value; const deviceId = store.get(authCookieNames.device)?.value; if (!refreshTok`
- `211: app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const respo`
- `696: │                     │ Auto-Loading (sourceMappingURL) leads to Arbitrary     │`
- `721: │                     │ allows uncatchable stack-overflow DoS via crafted      │`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
