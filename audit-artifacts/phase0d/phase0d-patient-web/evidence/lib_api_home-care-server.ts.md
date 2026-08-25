# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/home-care-server.ts`
- **Member SHA-256:** `0d160cc88b30bfa865bcd522ccc5bb3fef765099ab2f3165675063b8aa27c34b`
- **Line count:** 6
- **Read range:** `1-6`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: /** Server-only BFF boundary for patient home-care booking lists. */`
- `4: export function getPatientHomeCareBookings(accessToken: string) {`
- `5: return callPatientApi("/home-care/bookings/my", {}, accessToken);`
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
- `5: return callPatientApi("/home-care/bookings/my", {}, accessToken);`
### auth_ownership
- `4: export function getPatientHomeCareBookings(accessToken: string) {`
- `5: return callPatientApi("/home-care/bookings/my", {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
