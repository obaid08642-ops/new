# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/vitals-server.ts`
- **Member SHA-256:** `a3995d28e02a178f91fa618dc7a507d4bcba2a79aaba30707e6acffce34ccb6b`
- **Line count:** 18
- **Read range:** `1-18`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `4: export function getPatientVitalSummary(accessToken: string) {`
- `5: return callPatientApi("/health/vitals/summary", {}, accessToken);`
- `8: export function getPatientVitalHistory(accessToken: string) {`
- `9: return callPatientApi("/health/vitals?limit=100", {}, accessToken);`
- `12: export function getPatientHealthScore(accessToken: string) {`
- `13: return callPatientApi("/health/score", {}, accessToken);`
- `16: export function getPatientReports(accessToken: string) {`
- `17: return callPatientApi("/health/reports", {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
