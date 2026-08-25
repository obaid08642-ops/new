# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care.test.ts`
- **Member SHA-256:** `38d1cfa21bb2034e7fb8b6730264662c899db8ead6f10a16f76b0cfd975c6e1c`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: import { extractHomeCareBookings } from "./home-care";`
- `4: const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";`
- `7: it("keeps only booking service, state, and schedule fields", () => {`
- `8: const rows = extractHomeCareBookings({ data: [{ id: bookingId, service_name_ar: "Service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, duration: "hour", patient_name: "private", address: { address: "priv`
- `9: expect(rows).toEqual([{ id: bookingId, serviceNameAr: "Service", serviceNameEn: undefined, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", sessionsCount: 2, duration: "hour" }]);`
### backend_consumers_or_contracts
- `2: import { extractHomeCareBookings } from "./home-care";`
### auth_ownership
- `8: const rows = extractHomeCareBookings({ data: [{ id: bookingId, service_name_ar: "Service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, duration: "hour", patient_name: "private", address: { address: "priv`
- `9: expect(rows).toEqual([{ id: bookingId, serviceNameAr: "Service", serviceNameEn: undefined, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", sessionsCount: 2, duration: "hour" }]);`
### state_transitions
- `7: it("keeps only booking service, state, and schedule fields", () => {`
- `8: const rows = extractHomeCareBookings({ data: [{ id: bookingId, service_name_ar: "Service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, duration: "hour", patient_name: "private", address: { address: "priv`
- `9: expect(rows).toEqual([{ id: bookingId, serviceNameAr: "Service", serviceNameEn: undefined, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", sessionsCount: 2, duration: "hour" }]);`
### payment_insurance_relevance
- `8: const rows = extractHomeCareBookings({ data: [{ id: bookingId, service_name_ar: "Service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, duration: "hour", patient_name: "private", address: { address: "priv`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
