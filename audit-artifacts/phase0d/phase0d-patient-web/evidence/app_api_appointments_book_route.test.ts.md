# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/book/route.test.ts`
- **Member SHA-256:** `e6f9d5ef584d735edf468e5e51b728be93496b3cde85b49d0743ad22d83acc8f`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { POST } from "./route";`
- `9: function request(body: unknown, headers: HeadersInit = {}) { return new Request("https://web.test/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "idempotency-test-123456", ...head`
- `12: describe("appointment booking BFF", () => {`
- `14: it("requires an idempotency key and validates the booking body", async () => {`
- `24: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201 }));`
- `26: expect(response.status).toBe(201); expect(await response.json()).toEqual({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment" });`
- `27: expect(state.callPatientApi).toHaveBeenCalledWith("/unified-bookings", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "idempotency-test-123456", "x-device-id": "device-1" }) }), "server-access");`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `9: function request(body: unknown, headers: HeadersInit = {}) { return new Request("https://web.test/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "idempotency-test-123456", ...head`
### auth_ownership
- `3: const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));`
- `5: vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));`
- `13: beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });`
- `18: it("requires an httpOnly access session", async () => {`
- `19: state.cookieStore.get.mockReturnValue(undefined);`
### state_transitions
- `3: const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));`
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `5: vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));`
- `13: beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });`
- `15: expect((await POST(request(valid, { "idempotency-key": "short" }))).status).toBe(400);`
- `16: expect((await POST(request({ ...valid, type: "invalid" }))).status).toBe(400);`
- `19: state.cookieStore.get.mockReturnValue(undefined);`
- `20: expect((await POST(request(valid))).status).toBe(401);`
- `21: expect(state.callPatientApi).not.toHaveBeenCalled();`
- `24: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201 }));`
- `26: expect(response.status).toBe(201); expect(await response.json()).toEqual({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment" });`
- `27: expect(state.callPatientApi).toHaveBeenCalledWith("/unified-bookings", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "idempotency-test-123456", "x-device-id": "device-1" }) }), "server-access");`
### payment_insurance_relevance
- `23: it("forwards the verified payload with idempotency and returns only the public result", async () => {`
- `24: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201 }));`
- `26: expect(response.status).toBe(201); expect(await response.json()).toEqual({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment" });`
### error_empty_loading_retry_cancel
- `24: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201 }));`
- `26: expect(response.status).toBe(201); expect(await response.json()).toEqual({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment" });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
