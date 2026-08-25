# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/breathing-server.ts`
- **Member SHA-256:** `a4466e9e8b06aea0ace2e12815156addddc199becb1a16af4b22f208428e9583`
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
- `2: export function getPatientBreathingHistory(accessToken:string){return callPatientApi("/mental-health/breathing",{},accessToken);}`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
