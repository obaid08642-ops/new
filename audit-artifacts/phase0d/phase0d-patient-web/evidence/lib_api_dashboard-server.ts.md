# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/dashboard-server.ts`
- **Member SHA-256:** `c583a7b4afebfb4df7bbcc436cb95ec042fcef23dd9298b0d6988a8fe8b83ab3`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `3: /** Server-only reads for the patient dashboard. No browser token or fallback data. */`
- `4: export function getPatientDashboardProfile(accessToken: string) {`
- `5: return callPatientApi("/users/me/profile", {}, accessToken);`
- `8: export function getPatientDashboardUpcomingAppointment(accessToken: string) {`
- `9: return callPatientApi("/home/upcoming-appointment", {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
