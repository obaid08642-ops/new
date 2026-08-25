# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase3-contract-baseline.txt`
- **Member SHA-256:** `3b68c4810d110404c3633aede1850d64fd480528e90950152281bac89cc83f4a`
- **Line count:** 101
- **Read range:** `1-101`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: app/api/auth/otp/verify/route.ts:7:export async function POST(request: Request) {`
- `3: app/api/auth/otp/verify/route.ts:10:  const upstream = await callPatientApi("/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `4: app/api/auth/otp/request/route.ts:7:export async function POST(request: Request) {`
- `5: app/api/auth/otp/request/route.ts:10:  const upstream = await callPatientApi("/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `6: app/api/auth/verify-2fa/route.ts:8:export async function POST(request: Request) {`
- `7: app/api/auth/verify-2fa/route.ts:11:  const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `8: app/api/auth/session/exchange/route.ts:7:export async function POST(request: Request) {`
- `9: app/api/auth/session/exchange/route.ts:12:  const upstream = await callPatientApi("/auth/session/exchange", { method: "POST", headers: { cookie, "x-device-id": request.headers.get("x-nabd-device-id") || crypto.randomUUID() } });`
- `10: app/api/auth/session/route.ts:5:export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPa`
- `11: app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const respo`
- `12: app/api/auth/login/route.ts:8:export async function POST(request: Request) {`
- `13: app/api/auth/login/route.ts:11:  const upstream = await callPatientApi("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
### backend_consumers_or_contracts
- `2: app/api/auth/otp/verify/route.ts:7:export async function POST(request: Request) {`
- `3: app/api/auth/otp/verify/route.ts:10:  const upstream = await callPatientApi("/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `4: app/api/auth/otp/request/route.ts:7:export async function POST(request: Request) {`
- `5: app/api/auth/otp/request/route.ts:10:  const upstream = await callPatientApi("/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `6: app/api/auth/verify-2fa/route.ts:8:export async function POST(request: Request) {`
- `7: app/api/auth/verify-2fa/route.ts:11:  const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `8: app/api/auth/session/exchange/route.ts:7:export async function POST(request: Request) {`
- `9: app/api/auth/session/exchange/route.ts:12:  const upstream = await callPatientApi("/auth/session/exchange", { method: "POST", headers: { cookie, "x-device-id": request.headers.get("x-nabd-device-id") || crypto.randomUUID() } });`
- `10: app/api/auth/session/route.ts:5:export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPa`
- `11: app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const respo`
- `12: app/api/auth/login/route.ts:8:export async function POST(request: Request) {`
- `13: app/api/auth/login/route.ts:11:  const upstream = await callPatientApi("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
### auth_ownership
- `2: app/api/auth/otp/verify/route.ts:7:export async function POST(request: Request) {`
- `3: app/api/auth/otp/verify/route.ts:10:  const upstream = await callPatientApi("/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `4: app/api/auth/otp/request/route.ts:7:export async function POST(request: Request) {`
- `5: app/api/auth/otp/request/route.ts:10:  const upstream = await callPatientApi("/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `7: app/api/auth/verify-2fa/route.ts:11:  const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `8: app/api/auth/session/exchange/route.ts:7:export async function POST(request: Request) {`
- `9: app/api/auth/session/exchange/route.ts:12:  const upstream = await callPatientApi("/auth/session/exchange", { method: "POST", headers: { cookie, "x-device-id": request.headers.get("x-nabd-device-id") || crypto.randomUUID() } });`
- `10: app/api/auth/session/route.ts:5:export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPa`
- `11: app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const respo`
- `12: app/api/auth/login/route.ts:8:export async function POST(request: Request) {`
- `13: app/api/auth/login/route.ts:11:  const upstream = await callPatientApi("/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });`
- `14: lib/api/articles-server.ts:18:export function getPatientArticleBookmarks(accessToken: string) { return callPatientApi("/articles/bookmarks/mine", {}, accessToken); }`
### state_transitions
- `10: app/api/auth/session/route.ts:5:export async function GET() { const token = (await cookies()).get(authCookieNames.access)?.value; if (!token) return NextResponse.json({ authenticated: false }, { status: 401 }); const upstream = await callPa`
- `11: app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const respo`
- `66: app/api/appointments/[appointmentId]/cancel/route.ts:11:export async function POST(request: Request, context: Context) {`
- `67: app/api/appointments/[appointmentId]/cancel/route.ts:20:  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": ke`
- `70: components-next/call-token-launcher.tsx:11:  async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"`
- `71: components-next/appointment-reschedule-form.tsx:13:  async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}`
- `72: components-next/appointment-actions.tsx:12:  async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-ty`
- `82: app/api/appointments/[appointmentId]/call-token/route.test.ts:6:describe("call-token BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)});it`
- `85: app/api/appointments/[appointmentId]/reschedule/route.test.ts:7:describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:und`
- `87: app/api/appointments/[appointmentId]/cancel/route.test.ts:6:function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","`
- `88: app/api/appointments/[appointmentId]/cancel/route.test.ts:7:describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)}`
- `89: app/api/appointments/[appointmentId]/cancel/route.ts:20:  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": ke`
### payment_insurance_relevance
- `26: lib/api/claims-server.ts:4:  return callPatientApi("/insurance/claims", {}, accessToken);`
- `36: lib/api/payments-server.ts:6:  return callPatientApi(`/payments/intent/${kind.data}/${bookingId}`, { method: "POST", headers: { "idempotency-key": idempotencyKey } }, accessToken);`
- `50: lib/api/insurance-server.ts:2:export function getPatientInsurancePolicy(accessToken: string) { return callPatientApi("/insurance/my-policy", {}, accessToken); }`
- `51: lib/api/insurance-server.ts:3:export function getPatientInsuranceBenefits(accessToken: string) { return callPatientApi("/insurance/benefits-summary", {}, accessToken); }`
- `68: app/api/appointments/[appointmentId]/payment-intent/route.ts:11:export async function POST(request: Request, context: Context) {`
- `85: app/api/appointments/[appointmentId]/reschedule/route.test.ts:7:describe("appointment reschedule BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:und`
- `90: app/api/appointments/[appointmentId]/payment-intent/route.test.ts:8:function req(headers: HeadersInit = {}) { return new Request(`https://web.test/api/appointments/${id}/payment-intent`, { method: "POST", headers: { "idempotency-key": "paym`
### error_empty_loading_retry_cancel
- `11: app/api/auth/logout/route.ts:5:export async function POST() { const token = (await cookies()).get(authCookieNames.access)?.value; if (token) await callPatientApi("/auth/logout", { method: "POST" }, token).catch(() => undefined); const respo`
- `66: app/api/appointments/[appointmentId]/cancel/route.ts:11:export async function POST(request: Request, context: Context) {`
- `67: app/api/appointments/[appointmentId]/cancel/route.ts:20:  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": ke`
- `70: components-next/call-token-launcher.tsx:11:  async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"`
- `71: components-next/appointment-reschedule-form.tsx:13:  async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}`
- `72: components-next/appointment-actions.tsx:12:  async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-ty`
- `87: app/api/appointments/[appointmentId]/cancel/route.test.ts:6:function req(headers:HeadersInit={},body:unknown={}){return new Request(`https://web.test/api/appointments/${id}/cancel`,{method:"POST",headers:{"content-type":"application/json","`
- `88: app/api/appointments/[appointmentId]/cancel/route.test.ts:7:describe("appointment cancel BFF",()=>{beforeEach(()=>{state.call.mockReset();state.cookies.get.mockImplementation((n:string)=>n==="nabd_access"?{value:"server-access"}:undefined)}`
- `89: app/api/appointments/[appointmentId]/cancel/route.ts:20:  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": ke`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
