# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AB_PROVIDER_NURSING_QUEUE_CONTRACT_20260819.md`
- **Member SHA-256:** `2232d37c8c61d424f6ccd29a8259fa97c0b737e5fd5aeae9d6c77fddfc32c608`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The Provider nursing dashboard loaded a nonexistent `/nursing/jobs/active` endpoint and posted acceptance/rejection to nonexistent `/home-care/bookings/:id/respond` paths. The live Home Care contract exposes `/home-care/visits` and `/home-c`
- `30: | Branch upload | **PASS** — source commit `fe47ed2` (`fix: align nursing queue workflow`) is on `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- `5: The Provider nursing dashboard loaded a nonexistent `/nursing/jobs/active` endpoint and posted acceptance/rejection to nonexistent `/home-care/bookings/:id/respond` paths. The live Home Care contract exposes `/home-care/visits` and `/home-c`
- `11: | Provider queue | Nursing orders load from the authenticated `/home-care/visits` queue. The display distinguishes `NEW_REQUEST` from active server states instead of relying on an assumed `PENDING`-only shape. |`
- `12: | Provider accept/reject | Both actions call `/home-care/visits/:id/respond`. No local accepted state is written; refresh/back happens only after the server response. |`
- `34: This batch does not create a nursing visit, accept an order, track GPS, complete care or touch production data. Phase 11 must validate a linked sandbox patient/nursing provider lifecycle across queue → accept → transit → arrive → care → rep`
### auth_ownership
- `12: | Provider accept/reject | Both actions call `/home-care/visits/:id/respond`. No local accepted state is written; refresh/back happens only after the server response. |`
### state_transitions
- `5: The Provider nursing dashboard loaded a nonexistent `/nursing/jobs/active` endpoint and posted acceptance/rejection to nonexistent `/home-care/bookings/:id/respond` paths. The live Home Care contract exposes `/home-care/visits` and `/home-c`
- `11: | Provider queue | Nursing orders load from the authenticated `/home-care/visits` queue. The display distinguishes `NEW_REQUEST` from active server states instead of relying on an assumed `PENDING`-only shape. |`
- `12: | Provider accept/reject | Both actions call `/home-care/visits/:id/respond`. No local accepted state is written; refresh/back happens only after the server response. |`
- `13: | Backend acceptance | A provider can accept only an unassigned `NEW_REQUEST` visit. Acceptance is applied by `WorkflowEngineService`, binds the authenticated provider and emits the state history atomically within the workflow mutation. |`
- `14: | Backend rejection | A rejection is recorded as a non-terminal offer decision while keeping the visit unassigned and in `NEW_REQUEST`; it cannot alter an already-confirmed visit. |`
- `15: | Workflow map | The nursing domain recognizes `NEW_REQUEST`, `IN_TRANSIT`, `ARRIVED`, `CARE_IN_PROGRESS`, `NO_SHOW` and `ESCALATED_EMERGENCY`, preventing unknown-state handling from silently coercing Home Care lifecycle values. |`
- `34: This batch does not create a nursing visit, accept an order, track GPS, complete care or touch production data. Phase 11 must validate a linked sandbox patient/nursing provider lifecycle across queue → accept → transit → arrive → care → rep`
### payment_insurance_relevance
- `14: | Backend rejection | A rejection is recorded as a non-terminal offer decision while keeping the visit unassigned and in `NEW_REQUEST`; it cannot alter an already-confirmed visit. |`
### error_empty_loading_retry_cancel
- `11: | Provider queue | Nursing orders load from the authenticated `/home-care/visits` queue. The display distinguishes `NEW_REQUEST` from active server states instead of relying on an assumed `PENDING`-only shape. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
