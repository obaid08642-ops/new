# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/appointments-server.test.ts`
- **Member SHA-256:** `7caa69a8707c5fce3d38d0e22e805ce2bf40297e3809bdbfd79ca0051be76157`
- **Line count:** 23
- **Read range:** `1-23`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `21: expect(callPatientApi).toHaveBeenNthCalledWith(3, "/unified-bookings/consultation/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-access-token");`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/upstream", () => ({ callPatientApi }));`
- `6: import { getPatientAppointment, getPatientAppointments, getPatientUnifiedConsultation } from "./appointments-server";`
- `19: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/care/appointments", {}, "server-access-token");`
- `20: expect(callPatientApi).toHaveBeenNthCalledWith(2, "/care/appointments/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-access-token");`
### auth_ownership
- `11: it("forwards appointment reads from the server boundary with the received access token only", async () => {`
- `15: await expect(getPatientAppointments("server-access-token")).resolves.toBe(response);`
- `16: await expect(getPatientAppointment("server-access-token", "91047ef2-ad36-422a-a184-629693e7c729")).resolves.toBe(response);`
- `17: await expect(getPatientUnifiedConsultation("server-access-token", "91047ef2-ad36-422a-a184-629693e7c729")).resolves.toBe(response);`
- `19: expect(callPatientApi).toHaveBeenNthCalledWith(1, "/care/appointments", {}, "server-access-token");`
- `20: expect(callPatientApi).toHaveBeenNthCalledWith(2, "/care/appointments/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-access-token");`
- `21: expect(callPatientApi).toHaveBeenNthCalledWith(3, "/unified-bookings/consultation/91047ef2-ad36-422a-a184-629693e7c729", {}, "server-access-token");`
### state_transitions
- `12: const response = new Response(null, { status: 200 });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
