# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE3_PROVIDER_FACILITY_OPERATIONS_GAPS_20260819.md`
- **Member SHA-256:** `23358dde40df466e386a920f6c27d8d1e11ae1f5c2170745389d1c3d02baf61a`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Facility staff list/create/delete has been migrated to the protected `/hospital/staff` contract rather than the removed legacy subaccount route. This is a positive ownership-contract alignment that must be maintained during remediation.`
- `16: | **P1** | Facility command UI remains Arabic/English-only and includes static notification signal | Branch, beds, staff, clinical order and financial screens lack six-language coverage; notification dot has no acknowledged count/state. | C`
- `20: Facility provider operations are **FIX/BLOCKED**. Staff-route alignment is retained, but branch scope and staff bootstrap security are release-critical and QR/emergency flows must remain fail-closed.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 3 Provider — facility operations and staff-administration gaps`
- `5: Facility staff list/create/delete has been migrated to the protected `/hospital/staff` contract rather than the removed legacy subaccount route. This is a positive ownership-contract alignment that must be maintained during remediation.`
- `11: | **P0** | Branch selection has no data scope effect | Selected branch only changes local chip styling; beds, surgeries, inbox, appointments, staff, and KPI requests omit the selected branch ID. A multi-branch hospital can view/mutate mixed`
- `12: | **P0** | New staff credentials are generated with predictable client randomness and displayed as a password card | The client creates `TempPass#` plus four `Math.random` digits, POSTs it, and renders it for sharing. This lacks one-time in`
- `14: | **P1** | Staff creation sends generic defaults rather than governed role policy | Client sends default department `General` and `['read','write']`, while permissions/role/specialty/license should be determined by approved facility policy `
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed defects`
- `12: | **P0** | New staff credentials are generated with predictable client randomness and displayed as a password card | The client creates `TempPass#` plus four `Math.random` digits, POSTs it, and renders it for sharing. This lacks one-time in`
- `13: | **P1** | Facility identity and order activity can be fabricated or incomplete | Header hard-codes “Nabdah Medical Hospital”; pending order uses generic patient/amount fallbacks, active tab always shows no appointments, and fetch failures `
- `14: | **P1** | Staff creation sends generic defaults rather than governed role policy | Client sends default department `General` and `['read','write']`, while permissions/role/specialty/license should be determined by approved facility policy `
- `15: | **P1** | QR check-in and SOS dispatch are visible despite fail-closed governance | Facility navigation exposes QR check-in and SOS dispatch flows while their consent/credential/location contracts remain unapproved. | Disable/remove the pr`
- `16: | **P1** | Facility command UI remains Arabic/English-only and includes static notification signal | Branch, beds, staff, clinical order and financial screens lack six-language coverage; notification dot has no acknowledged count/state. | C`
### payment_insurance_relevance
- `12: | **P0** | New staff credentials are generated with predictable client randomness and displayed as a password card | The client creates `TempPass#` plus four `Math.random` digits, POSTs it, and renders it for sharing. This lacks one-time in`
- `13: | **P1** | Facility identity and order activity can be fabricated or incomplete | Header hard-codes “Nabdah Medical Hospital”; pending order uses generic patient/amount fallbacks, active tab always shows no appointments, and fetch failures `
- `16: | **P1** | Facility command UI remains Arabic/English-only and includes static notification signal | Branch, beds, staff, clinical order and financial screens lack six-language coverage; notification dot has no acknowledged count/state. | C`
### error_empty_loading_retry_cancel
- `11: | **P0** | Branch selection has no data scope effect | Selected branch only changes local chip styling; beds, surgeries, inbox, appointments, staff, and KPI requests omit the selected branch ID. A multi-branch hospital can view/mutate mixed`
- `13: | **P1** | Facility identity and order activity can be fabricated or incomplete | Header hard-codes “Nabdah Medical Hospital”; pending order uses generic patient/amount fallbacks, active tab always shows no appointments, and fetch failures `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
