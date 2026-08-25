# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/insurance-server.ts`
- **Member SHA-256:** `365f06727a5a9224d3079d51c951ae9e5cdffed3121af8b9d7f64e4d5a79b76d`
- **Line count:** 3
- **Read range:** `1-3`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
- `2: export function getPatientInsurancePolicy(accessToken: string) { return callPatientApi("/insurance/my-policy", {}, accessToken); }`
- `3: export function getPatientInsuranceBenefits(accessToken: string) { return callPatientApi("/insurance/benefits-summary", {}, accessToken); }`
### auth_ownership
- `2: export function getPatientInsurancePolicy(accessToken: string) { return callPatientApi("/insurance/my-policy", {}, accessToken); }`
- `3: export function getPatientInsuranceBenefits(accessToken: string) { return callPatientApi("/insurance/benefits-summary", {}, accessToken); }`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `2: export function getPatientInsurancePolicy(accessToken: string) { return callPatientApi("/insurance/my-policy", {}, accessToken); }`
- `3: export function getPatientInsuranceBenefits(accessToken: string) { return callPatientApi("/insurance/benefits-summary", {}, accessToken); }`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
