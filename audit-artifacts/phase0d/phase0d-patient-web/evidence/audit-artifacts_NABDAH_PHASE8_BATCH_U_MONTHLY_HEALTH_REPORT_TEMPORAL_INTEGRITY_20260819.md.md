# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_U_MONTHLY_HEALTH_REPORT_TEMPORAL_INTEGRITY_20260819.md`
- **Member SHA-256:** `d9d755f2482eba6309f3119401dcafeac28a635eeae2a4bd265b3095aa34be87`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | Load state | The report uses settled fetch results and renders an explicit retryable load-failure state when every source fails. A genuine all-empty result remains a distinct empty-state experience. |`
- `26: | Branch upload | **PASS** — source commit `a08bbb6` (`fix: normalize monthly report appointment dates`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `30: No report, appointment, vital, medication, trend, or production record was created or changed. Phase 10–11 must still inspect report rendering on Android/iOS at supported breakpoints, test time-zone boundary cases against linked sandbox app`
### state_transitions
- `5: The Patient monthly report displayed consultation counts and timelines using `scheduled_at`, while the current appointment contract uses `slot_start`. In addition, every failed report endpoint was coerced to `[]`, allowing a total data-load`
- `12: | Collection validation | Report collections accept only an array or a `{ data: [] }` contract. Other response shapes reject instead of becoming an empty list. |`
- `13: | Load state | The report uses settled fetch results and renders an explicit retryable load-failure state when every source fails. A genuine all-empty result remains a distinct empty-state experience. |`
- `14: | Scope | Counts, upcoming status, and rendered appointment date/time now use the same normalized time function; no health scores, trend narratives, diagnosis, or recommendations are generated. |`
### payment_insurance_relevance
- `5: The Patient monthly report displayed consultation counts and timelines using `scheduled_at`, while the current appointment contract uses `slot_start`. In addition, every failed report endpoint was coerced to `[]`, allowing a total data-load`
### error_empty_loading_retry_cancel
- `5: The Patient monthly report displayed consultation counts and timelines using `scheduled_at`, while the current appointment contract uses `slot_start`. In addition, every failed report endpoint was coerced to `[]`, allowing a total data-load`
- `12: | Collection validation | Report collections accept only an array or a `{ data: [] }` contract. Other response shapes reject instead of becoming an empty list. |`
- `13: | Load state | The report uses settled fetch results and renders an explicit retryable load-failure state when every source fails. A genuine all-empty result remains a distinct empty-state experience. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
