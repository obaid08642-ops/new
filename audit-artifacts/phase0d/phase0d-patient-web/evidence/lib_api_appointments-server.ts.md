# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/appointments-server.ts`
- **Member SHA-256:** `7ff0cb35b31432bf3e615e1944c7ce07806042157d15d7b19b78853a8b639788`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: return callPatientApi(`/unified-bookings/consultation/${appointmentId}`, {}, accessToken);`
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
- `5: return callPatientApi("/care/appointments", {}, accessToken);`
- `9: return callPatientApi(`/care/appointments/${appointmentId}`, {}, accessToken);`
### auth_ownership
- `4: export function getPatientAppointments(accessToken: string) {`
- `5: return callPatientApi("/care/appointments", {}, accessToken);`
- `8: export function getPatientAppointment(accessToken: string, appointmentId: string) {`
- `9: return callPatientApi(`/care/appointments/${appointmentId}`, {}, accessToken);`
- `12: export function getPatientUnifiedConsultation(accessToken: string, appointmentId: string) {`
- `13: return callPatientApi(`/unified-bookings/consultation/${appointmentId}`, {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
