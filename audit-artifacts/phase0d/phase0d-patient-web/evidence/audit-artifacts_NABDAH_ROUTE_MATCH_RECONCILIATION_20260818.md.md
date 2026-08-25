# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_ROUTE_MATCH_RECONCILIATION_20260818.md`
- **Member SHA-256:** `766130284356f577adc11f56056a853e196cd9d3500a40356bd058639dab3560`
- **Line count:** 5
- **Read range:** `1-5`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Nabdah route match reconciliation — initial compiled pass`
- `3: The direct Nabdah Backend source produced 933 composed controller routes after combining class-level and method-level decorators. The consumer inventory produced 587 path-like records in this first pass; 235 matched a compiled backend route`
### backend_consumers_or_contracts
- `5: The 352 review records are not a defect count. The extractor also captured client navigation destinations such as `/(tabs)` and `/(auth)`, plus dynamic/template expressions that are not API calls. The next pass must filter navigation-only p`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
