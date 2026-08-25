# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/medicines-server.ts`
- **Member SHA-256:** `54432ee58affd721ec04017f46e27527d74e1b27c3de41500f90b43f57a9d3bf`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: /** Server-only BFF boundary for catalog reads initiated by private patient pages. */`
- `5: export function getPatientMedicines(accessToken: string, search: { q?: string; page: number }) {`
### backend_consumers_or_contracts
- `1: import { medicineQuery } from "@/lib/api/medicines";`
- `2: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `5: export function getPatientMedicines(accessToken: string, search: { q?: string; page: number }) {`
- `6: return callPatientApi(medicineQuery(search), {}, accessToken);`
- `9: export function getPatientMedicine(accessToken: string, medicineId: string) {`
- `10: return callPatientApi(`/medicines/${medicineId}/details`, {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
