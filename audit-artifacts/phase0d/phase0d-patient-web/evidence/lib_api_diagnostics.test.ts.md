# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/diagnostics.test.ts`
- **Member SHA-256:** `6fce2197af13b6a239c52a0c2192f7894fd74784a395abb2071c7564693d9b99`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { extractDiagnosticBooking, extractDiagnosticBookings, parseDiagnosticBookingId, parseDiagnosticDomain } from "./diagnostics";`
- `4: const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";`
- `6: describe("diagnostic booking response guards", () => {`
- `7: it("allows only approved booking fields and ignores patient, pricing, reports, and document fields", () => {`
- `8: const rows = extractDiagnosticBookings({ data: [{ id: bookingId, state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", patient_name: "private", total_price: 500, reports: [{ url: "private" }] }] });`
- `9: expect(rows).toEqual([{ id: bookingId, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", locationType: undefined, scanNameAr: undefined, scanNameEn: undefined, medicalReferralRequired: undefined, hasReport: true }]);`
- `12: it("validates diagnostic domains and UUID booking identifiers", () => {`
- `16: expect(parseDiagnosticBookingId(bookingId).success).toBe(true);`
- `17: expect(parseDiagnosticBookingId("invalid").success).toBe(false);`
- `18: expect(extractDiagnosticBooking({ id: "invalid" })).toBeNull();`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `15: expect(parseDiagnosticDomain("admin")).toBeNull();`
### state_transitions
- `7: it("allows only approved booking fields and ignores patient, pricing, reports, and document fields", () => {`
- `8: const rows = extractDiagnosticBookings({ data: [{ id: bookingId, state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", patient_name: "private", total_price: 500, reports: [{ url: "private" }] }] });`
- `9: expect(rows).toEqual([{ id: bookingId, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", locationType: undefined, scanNameAr: undefined, scanNameEn: undefined, medicalReferralRequired: undefined, hasReport: true }]);`
- `16: expect(parseDiagnosticBookingId(bookingId).success).toBe(true);`
- `17: expect(parseDiagnosticBookingId("invalid").success).toBe(false);`
### payment_insurance_relevance
- `8: const rows = extractDiagnosticBookings({ data: [{ id: bookingId, state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", patient_name: "private", total_price: 500, reports: [{ url: "private" }] }] });`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
