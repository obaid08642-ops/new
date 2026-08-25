# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/notifications-server.ts`
- **Member SHA-256:** `d5e1faeb9257e5e41b69145d3b794d9180fcae9cd3b19d159a06b9aba897e0e5`
- **Line count:** 6
- **Read range:** `1-6`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
- `5: return callPatientApi("/notifications", {}, accessToken);`
### auth_ownership
- `4: export function getPatientNotifications(accessToken: string) {`
- `5: return callPatientApi("/notifications", {}, accessToken);`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
