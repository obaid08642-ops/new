# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/auth/otp/otp-routes.test.ts`
- **Member SHA-256:** `ffecab7e34dc0892a9a5189dcf3ad3ee124ec4f658b35f49695c1f587f4a4670`
- **Line count:** 36
- **Read range:** `1-36`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { POST as requestOtp } from "./request/route";`
- `7: import { POST as verifyOtp } from "./verify/route";`
- `8: import { POST as exchangeSession } from "../session/exchange/route";`
- `12: describe("patient OTP BFF routes", () => {`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `15: const response = await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "patient@example.com" }));`
- `16: expect(response.status).toBe(201); expect(state.callPatientApi).toHaveBeenCalledWith("/auth/otp/request", expect.objectContaining({ method: "POST" }));`
- `17: expect((await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "x" }))).status).toBe(400);`
- `20: state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60, exchangeToken: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_otp_exchange=secret; Path=/api/v1/auth/session/exchange; Htt`
- `21: const response = await verifyOtp(jsonRequest("/api/auth/otp/verify", { identifier: "patient@example.com", code: "123456" }));`
- `23: expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/session/exchange");`
- `27: state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, token: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_admin_token=secret; Path=/api/v1; HttpOnly; Secure" } }));`
- `28: const response = await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST", headers: { cookie: "nabd_otp_exchange=secret; unrelated=drop", "x-nabd-device-id": "device-test" } }));`
- `30: expect(state.callPatientApi).toHaveBeenCalledWith("/auth/session/exchange", expect.objectContaining({ headers: expect.objectContaining({ cookie: "nabd_otp_exchange=secret", "x-device-id": "device-test" }) }));`
- `34: expect((await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST" }))).status).toBe(400);`
### auth_ownership
- `6: import { POST as requestOtp } from "./request/route";`
- `7: import { POST as verifyOtp } from "./verify/route";`
- `8: import { POST as exchangeSession } from "../session/exchange/route";`
- `12: describe("patient OTP BFF routes", () => {`
- `15: const response = await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "patient@example.com" }));`
- `16: expect(response.status).toBe(201); expect(state.callPatientApi).toHaveBeenCalledWith("/auth/otp/request", expect.objectContaining({ method: "POST" }));`
- `17: expect((await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "x" }))).status).toBe(400);`
- `19: it("accepts only the verified shape and rewrites the exchange cookie path", async () => {`
- `20: state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60, exchangeToken: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_otp_exchange=secret; Path=/api/v1/auth/session/exchange; Htt`
- `21: const response = await verifyOtp(jsonRequest("/api/auth/otp/verify", { identifier: "patient@example.com", code: "123456" }));`
- `23: expect(response.headers.get("set-cookie")).toContain("Path=/api/auth/session/exchange");`
- `24: expect(response.headers.get("set-cookie")).not.toContain("must-not-leak");`
### state_transitions
- `3: const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));`
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `14: state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 300 }), { status: 201 }));`
- `16: expect(response.status).toBe(201); expect(state.callPatientApi).toHaveBeenCalledWith("/auth/otp/request", expect.objectContaining({ method: "POST" }));`
- `17: expect((await requestOtp(jsonRequest("/api/auth/otp/request", { identifier: "x" }))).status).toBe(400);`
- `20: state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, expires_in: 60, exchangeToken: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_otp_exchange=secret; Path=/api/v1/auth/session/exchange; Htt`
- `22: expect(response.status).toBe(201); expect(await response.json()).toEqual({ ok: true, expires_in: 60 });`
- `27: state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: true, token: "must-not-leak" }), { status: 201, headers: { "set-cookie": "nabd_admin_token=secret; Path=/api/v1; HttpOnly; Secure" } }));`
- `29: expect(response.status).toBe(201); expect(await response.json()).toEqual({ authenticated: true });`
- `30: expect(state.callPatientApi).toHaveBeenCalledWith("/auth/session/exchange", expect.objectContaining({ headers: expect.objectContaining({ cookie: "nabd_otp_exchange=secret", "x-device-id": "device-test" }) }));`
- `34: expect((await exchangeSession(new Request("https://web.test/api/auth/session/exchange", { method: "POST" }))).status).toBe(400);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
