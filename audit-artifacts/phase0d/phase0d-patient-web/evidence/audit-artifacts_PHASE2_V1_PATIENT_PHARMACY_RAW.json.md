# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE2_V1_PATIENT_PHARMACY_RAW.json`
- **Member SHA-256:** `29c50064122024455e80d05b9f6667ccd61fe118bebb59eb612839f7f0ee01a3`
- **Line count:** 127
- **Read range:** `1-127`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `81: "/api/v1/patient/pharmacy/orders/{id}/submit": {`
- `83: "operationId": "PatientPharmacyController_submit_v1",`
- `104: "/api/v1/patient/pharmacy/orders/{id}/cancel": {`
- `106: "operationId": "PatientPharmacyController_cancel_v1",`
### backend_consumers_or_contracts
- `2: "/api/v1/patient/pharmacy/orders": {`
- `37: "/api/v1/patient/pharmacy/orders/{id}": {`
- `81: "/api/v1/patient/pharmacy/orders/{id}/submit": {`
- `104: "/api/v1/patient/pharmacy/orders/{id}/cancel": {`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `19: "name": "status",`
- `104: "/api/v1/patient/pharmacy/orders/{id}/cancel": {`
- `106: "operationId": "PatientPharmacyController_cancel_v1",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `104: "/api/v1/patient/pharmacy/orders/{id}/cancel": {`
- `106: "operationId": "PatientPharmacyController_cancel_v1",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
