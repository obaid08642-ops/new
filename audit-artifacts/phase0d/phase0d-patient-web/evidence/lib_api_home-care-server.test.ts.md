# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care-server.test.ts`
- **Member SHA-256:** `e1f2750537dcd38ee06ea21cc99bb276b19f0dfa011bda2567fbb3ddfd3c7c8f`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { getPatientHomeCareBookings } from "./home-care-server";`
- `13: await getPatientHomeCareBookings("server-token");`
- `14: expect(callPatientApi).toHaveBeenCalledWith("/home-care/bookings/my", {}, "server-token");`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));`
- `6: import { getPatientHomeCareBookings } from "./home-care-server";`
- `14: expect(callPatientApi).toHaveBeenCalledWith("/home-care/bookings/my", {}, "server-token");`
### auth_ownership
- `10: it("uses the bounded home-care list path and server token", async () => {`
- `13: await getPatientHomeCareBookings("server-token");`
- `14: expect(callPatientApi).toHaveBeenCalledWith("/home-care/bookings/my", {}, "server-token");`
### state_transitions
- `11: const response = new Response(null, { status: 200 });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
