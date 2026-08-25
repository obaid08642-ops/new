# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/appointments.test.ts`
- **Member SHA-256:** `0a01f28b518d88f0997b2d61ee91767f4f28a4f693fb035a18a0979b020c18f9`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: it("accepts only UUID route identifiers and reads provider information only from a valid detail record", () => {`
### backend_consumers_or_contracts
- `2: import { extractAppointmentDetail, extractAppointmentRows, parseAppointmentId } from "./appointments";`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: const rows = extractAppointmentRows({ data: [{ id: appointmentId, status: "CONFIRMED", service_type: "video", slot_start: "2026-08-20T10:00:00.000Z", patient_id: "private", wait_time: "15" }] });`
- `9: expect(rows).toEqual([{ id: appointmentId, status: "CONFIRMED", serviceType: "video", slotStart: "2026-08-20T10:00:00.000Z", doctorName: undefined, specialty: undefined }]);`
- `13: expect(parseAppointmentId(appointmentId).success).toBe(true);`
- `14: expect(parseAppointmentId("not-an-appointment").success).toBe(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
