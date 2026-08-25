# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE11_SANDBOX_READONLY_AUTHORIZATION_WAVE2_20260819.md`
- **Member SHA-256:** `9e7f58a5f323f2dad97639bc90554dd6b02d849dd92cb8367c351731f7596ad7`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: | Patient1 → `GET /unified-bookings/mine` | Own timeline only | Final bounded recheck returned `200` | **PASS** |`
- `16: | Patient2 → Patient1 unified-booking detail | `403` or existence-hiding `404` | `404` | **PASS** |`
- `22: The local release source validates the intended ownership model for lab results: `mine` filters by the authenticated patient and singular reads hide a foreign record as `404`. It also validates the intended unified-booking model: list queri`
### backend_consumers_or_contracts
- `17: | Unauthenticated → `GET /orders/mine` | `401`/`403` | `401` | **PASS** |`
### auth_ownership
- `1: # Phase 11 — sandbox read-only authorization wave 2`
- `5: This wave used the two supplied patient sandbox accounts and read-only requests to the production API. When a Patient1 record was required, its opaque identifier was used only in-memory to make a Patient2 request. No identifier, token, clin`
- `18: | Patient1 → known admin report `GET /admin/referrals/report` | `401`/`403` | `403` | **PASS** |`
- `22: The local release source validates the intended ownership model for lab results: `mine` filters by the authenticated patient and singular reads hide a foreign record as `404`. It also validates the intended unified-booking model: list queri`
- `24: The pre-remediation archive exposed a material prescription-detail gap: `GET /prescriptions/:id` supplied only a bare identifier lookup without a current-user ownership argument. The live BOLA test could not be exercised because Patient1 ha`
### state_transitions
- `28: The bounded live checks prove only the results in the table. They do not establish successful end-to-end service workflow, payment, claims, messaging, realtime, notification delivery, storage, device behavior or release readiness.`
### payment_insurance_relevance
- `28: The bounded live checks prove only the results in the table. They do not establish successful end-to-end service workflow, payment, claims, messaging, realtime, notification delivery, storage, device behavior or release readiness.`
### error_empty_loading_retry_cancel
- `22: The local release source validates the intended ownership model for lab results: `mine` filters by the authenticated patient and singular reads hide a foreign record as `404`. It also validates the intended unified-booking model: list queri`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
