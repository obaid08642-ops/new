# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/api/patient/[...path]/route.test.ts`
- **Member SHA-256:** `4472373e769b4065019e7ed2981933a77ef056c3ddc6c3bc6363e334f2214148`
- **Line count:** 103
- **Read range:** `1-103`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `28: import { GET } from "./route";`
- `83: it("rejects incomplete refresh responses and clears the expired session without retrying", async () => {`
### backend_consumers_or_contracts
- `17: vi.mock("@/lib/auth/cookies", () => ({`
- `23: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `24: vi.mock("@/lib/api/response", () => ({`
- `34: nextUrl: new URL("https://web.nabd.plus/api/patient/orders/mine"),`
- `64: expect(state.callPatientApi).toHaveBeenNthCalledWith(1, "/orders/mine", expect.any(Object), "expired-access");`
- `65: expect(state.callPatientApi).toHaveBeenNthCalledWith(2, "/auth/refresh", expect.objectContaining({ body: JSON.stringify({ refresh_token: "valid-refresh" }) }));`
- `66: expect(state.callPatientApi).toHaveBeenNthCalledWith(3, "/orders/mine", expect.any(Object), "new-access");`
### auth_ownership
- `6: clearSessionCookies: vi.fn(),`
- `7: setSessionCookies: vi.fn(),`
- `11: cookies: async () => ({ get: (name: string) => {`
- `17: vi.mock("@/lib/auth/cookies", () => ({`
- `18: authCookieNames: { access: "nabd_access", refresh: "nabd_refresh", device: "nabd_device" },`
- `19: clearSessionCookies: state.clearSessionCookies,`
- `20: setSessionCookies: state.setSessionCookies,`
- `42: describe("patient BFF session rotation", () => {`
- `46: ["nabd_refresh", "valid-refresh"],`
- `50: state.clearSessionCookies.mockReset();`
- `51: state.setSessionCookies.mockReset();`
- `54: it("rotates once on upstream 401, retries with the new access token, and sets only returned tokens", async () => {`
### state_transitions
- `3: const state = vi.hoisted(() => ({`
- `12: const value = state.values.get(name);`
- `19: clearSessionCookies: state.clearSessionCookies,`
- `20: setSessionCookies: state.setSessionCookies,`
- `23: vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `25: forwardApiResponse: async (upstream: Response) => new Response(null, { status: upstream.status }),`
- `44: state.values = new Map([`
- `49: state.callPatientApi.mockReset();`
- `50: state.clearSessionCookies.mockReset();`
- `51: state.setSessionCookies.mockReset();`
- `55: state.callPatientApi`
- `56: .mockResolvedValueOnce(new Response(null, { status: 401 }))`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `71: it("does not refresh without both refresh and device cookies, and clears the failed session", async () => {`
- `83: it("rejects incomplete refresh responses and clears the expired session without retrying", async () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
