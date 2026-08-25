# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/appointments/[appointmentId]/payment-intent/route.test.ts`
- **Member SHA-256:** `0011c517e672229bcdd3faf7cb2214023a37a93bc8b214fd5c1b1fa1b2e0b2bb`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { POST } from "./route";`
### backend_consumers_or_contracts
- `3: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `8: function req(headers: HeadersInit = {}) { return new Request(`https://web.test/api/appointments/${id}/payment-intent`, { method: "POST", headers: { "idempotency-key": "payment-key-123456", ...headers } }); }`
### auth_ownership
- `2: const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));`
- `4: vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));`
- `10: beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });`
- `11: it("requires idempotency and a valid owned session", async () => {`
- `13: state.cookieStore.get.mockReturnValue(undefined);`
- `23: it("preserves gateway and ownership errors without fabricating an intent", async () => {`
### state_transitions
- `2: const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));`
- `3: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `4: vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));`
- `10: beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });`
- `12: expect((await POST(req({ "idempotency-key": "short" }), context)).status).toBe(400);`
- `13: state.cookieStore.get.mockReturnValue(undefined);`
- `14: expect((await POST(req(), context)).status).toBe(401);`
- `15: expect(state.callPatientApi).not.toHaveBeenCalled();`
- `18: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", client_secret: "secret", patient_id: "private" }), { status: 201 }));`
- `20: expect(response.status).toBe(201); expect(await response.json()).toEqual({ transactionId: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR" });`
- `21: expect(state.callPatientApi).toHaveBeenCalledWith("/payments/intent/consultation/22222222-2222-4222-8222-222222222222", expect.objectContaining({ method: "POST", headers: { "idempotency-key": "payment-key-123456" } }), "server-access");`
- `23: it("preserves gateway and ownership errors without fabricating an intent", async () => {`
### payment_insurance_relevance
- `8: function req(headers: HeadersInit = {}) { return new Request(`https://web.test/api/appointments/${id}/payment-intent`, { method: "POST", headers: { "idempotency-key": "payment-key-123456", ...headers } }); }`
- `9: describe("payment intent BFF", () => {`
- `21: expect(state.callPatientApi).toHaveBeenCalledWith("/payments/intent/consultation/22222222-2222-4222-8222-222222222222", expect.objectContaining({ method: "POST", headers: { "idempotency-key": "payment-key-123456" } }), "server-access");`
### error_empty_loading_retry_cancel
- `18: state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", client_secret: "secret", patient_id: "private" }), { status: 201 }));`
- `20: expect(response.status).toBe(201); expect(await response.json()).toEqual({ transactionId: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR" });`
- `23: it("preserves gateway and ownership errors without fabricating an intent", async () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
