# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/claims-server.ts`
- **Member SHA-256:** `7e7ed04a17e69db08ef403408d1017618b0ef4feb23d81cec75f1d6945eb31a2`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
- `4: return callPatientApi("/insurance/claims", {}, accessToken);`
### auth_ownership
- `3: export function getPatientClaims(accessToken: string) {`
- `4: return callPatientApi("/insurance/claims", {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `4: return callPatientApi("/insurance/claims", {}, accessToken);`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
