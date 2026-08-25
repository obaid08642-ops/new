# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/diagnostics-server.test.ts`
- **Member SHA-256:** `d115689371f5137d77381eabde6fd8178dc8f979f5b86b3c4f86a71f79772348`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: import { getDiagnosticBooking, getDiagnosticBookings } from "./diagnostics-server";`
- `14: await getDiagnosticBookings("server-token", "labs");`
- `15: await getDiagnosticBooking("server-token", "radiology", "91047ef2-ad36-422a-a184-629693e7c729");`
- `16: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/labs/bookings/mine", {}, "server-token");`
- `17: expect(callPatientApi).toHaveBeenNthCalledWith(2, "/radiology/bookings/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-token");`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));`
- `16: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/labs/bookings/mine", {}, "server-token");`
- `17: expect(callPatientApi).toHaveBeenNthCalledWith(2, "/radiology/bookings/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-token");`
### auth_ownership
- `11: it("forwards bounded diagnostic reads with the server access token only", async () => {`
- `14: await getDiagnosticBookings("server-token", "labs");`
- `15: await getDiagnosticBooking("server-token", "radiology", "91047ef2-ad36-422a-a184-629693e7c729");`
- `16: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/labs/bookings/mine", {}, "server-token");`
- `17: expect(callPatientApi).toHaveBeenNthCalledWith(2, "/radiology/bookings/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-token");`
### state_transitions
- `12: const response = new Response(null, { status: 200 });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
