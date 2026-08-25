# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/radiology-server.ts`
- **Member SHA-256:** `a4efc7805ae7e072c722b906ba795edafc2886a20f03d9fecfbb7c228f5ddfee`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { callPatientApi } from "@/lib/api/upstream";`
- `6: export function getPublicRadiologyModalities() { return callPatientApi("/radiology/modalities", { method: "GET", cache: "no-store" }); }`
- `14: return callPatientApi(`/radiology/services${params.toString() ? `?${params}` : ""}`, { method: "GET", cache: "no-store" });`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `5: export type RadiologyQuery = { modality?: string; bodyPart?: string; homeVisit?: string; homeOnly?: string; highestRated?: string; nearest?: string; lowestPrice?: string; search?: string };`
- `12: for (const [key, value] of [["home_visit", bool(query.homeVisit)], ["home_only", bool(query.homeOnly)], ["highest_rated", bool(query.highestRated)], ["nearest", bool(query.nearest)], ["lowest_price", bool(query.lowestPrice)]] as const) if (`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
