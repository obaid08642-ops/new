# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/wishlist-server.test.ts`
- **Member SHA-256:** `93064dee0bf94e2cf9aa804e680aba40f960b2d2c647792d1beeb0e0a9269551`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: it("forwards only the patient-owned read route with server access", async () => {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));`
- `3: vi.mock("./upstream", () => ({ callPatientApi: state.callPatientApi }));`
- `7: beforeEach(() => state.callPatientApi.mockReset());`
- `10: expect(state.callPatientApi).toHaveBeenCalledWith("/users/me/wishlist", {}, "server-access");`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
