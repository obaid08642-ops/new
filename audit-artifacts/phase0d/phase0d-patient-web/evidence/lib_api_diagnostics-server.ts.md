# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/diagnostics-server.ts`
- **Member SHA-256:** `1d4bf09d773825bb76aa6b8a885902f37019afa3bff393209a17bfd0b742448d`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: /** Server-only BFF boundary for private lab and radiology booking reads. */`
- `5: export function getDiagnosticBookings(accessToken: string, domain: DiagnosticDomain) {`
- `6: return callPatientApi(`/${domain}/bookings/mine`, {}, accessToken);`
- `9: export function getDiagnosticBooking(accessToken: string, domain: DiagnosticDomain, bookingId: string) {`
- `10: return callPatientApi(`/${domain}/bookings/${bookingId}`, {}, accessToken);`
### backend_consumers_or_contracts
- `1: import type { DiagnosticDomain } from "@/lib/api/diagnostics";`
- `2: import { callPatientApi } from "@/lib/api/upstream";`
- `6: return callPatientApi(`/${domain}/bookings/mine`, {}, accessToken);`
- `10: return callPatientApi(`/${domain}/bookings/${bookingId}`, {}, accessToken);`
### auth_ownership
- `5: export function getDiagnosticBookings(accessToken: string, domain: DiagnosticDomain) {`
- `6: return callPatientApi(`/${domain}/bookings/mine`, {}, accessToken);`
- `9: export function getDiagnosticBooking(accessToken: string, domain: DiagnosticDomain, bookingId: string) {`
- `10: return callPatientApi(`/${domain}/bookings/${bookingId}`, {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
