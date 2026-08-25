# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/mood-server.ts`
- **Member SHA-256:** `acd4cf2c7bd515c702dfa9a3d07511e29bd30f375ebdd4caf293b9c70ea08a4c`
- **Line count:** 2
- **Read range:** `1-2`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
### auth_ownership
- `2: export function getPatientMoodHistory(accessToken:string){return callPatientApi("/mental-health/mood?days=30",{},accessToken);}`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
