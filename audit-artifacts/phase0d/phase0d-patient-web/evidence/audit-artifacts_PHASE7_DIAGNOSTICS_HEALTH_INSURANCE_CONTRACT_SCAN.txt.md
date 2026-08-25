# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE7_DIAGNOSTICS_HEALTH_INSURANCE_CONTRACT_SCAN.txt`
- **Member SHA-256:** `71847aa50e83ebf663477b1076d9af2319d7bc4c2f5e03891a602ad75f5039e3`
- **Line count:** 135
- **Read range:** `1-135`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: POST /api/v1/labs/bookings | LabsController_book_v1 | body= False | responses= 201`
- `13: GET /api/v1/labs/bookings/mine | LabsController_mine_v1 | body= False | responses= 200`
- `14: GET /api/v1/labs/bookings/{id} | LabsController_oneBooking_v1 | body= False | responses= 200`
- `15: POST /api/v1/labs/bookings/{id}/cancel | LabsController_cancel_v1 | body= False | responses= 201`
- `16: PATCH /api/v1/labs/bookings/{id}/state | LabsController_transition_v1 | body= False | responses= 200`
- `17: POST /api/v1/labs/bookings/{id}/documents | LabsController_uploadDoc_v1 | body= False | responses= 201`
- `18: PATCH /api/v1/labs/bookings/{id}/insurance | LabsController_updateIns_v1 | body= False | responses= 200`
- `19: PATCH /api/v1/labs/bookings/{id}/items/{serviceId}/opt-in-cash | LabsController_optInCash_v1 | body= False | responses= 200`
- `20: POST /api/v1/labs/bookings/{id}/assign-technician | LabsController_assignTech_v1 | body= False | responses= 201`
- `21: POST /api/v1/labs/bookings/{id}/upload-report | LabsController_uploadReport_v1 | body= False | responses= 201`
- `22: PATCH /api/v1/labs/bookings/{id}/reschedule | LabsController_reschedule_v1 | body= False | responses= 200`
- `23: POST /api/v1/labs/bookings/{id}/gps | LabsController_updateGps_v1 | body= False | responses= 201`
### backend_consumers_or_contracts
- `1: GET /api/v1/health/liveness | HealthController_liveness_v1 | body= False | responses= 200`
- `2: GET /api/v1/health/readiness | HealthController_health_v1 | body= False | responses= 200`
- `3: GET /api/v1/users/me/insurance | UsersInsuranceController_getInsurance_v1 | body= False | responses= 200`
- `4: POST /api/v1/users/me/insurance | UsersInsuranceController_updateInsurance_v1 | body= False | responses= 201`
- `5: PATCH /api/v1/orders/{id}/insurance-approval | OrdersController_updateInsuranceApproval_v1 | body= False | responses= 200`
- `6: POST /api/v1/pharmacy/orders/{id}/insurance | PharmacyOpsController_setInsurance_v1 | body= False | responses= 201`
- `7: GET /api/v1/care/insurance | CareController_insuranceCompanies_v1 | body= False | responses= 200`
- `8: GET /api/v1/labs/services | LabsController_services_v1 | body= False | responses= 200`
- `9: GET /api/v1/labs/packages | LabsController_packages_v1 | body= False | responses= 200`
- `10: GET /api/v1/labs/categories | LabsController_categories_v1 | body= False | responses= 200`
- `11: GET /api/v1/labs/services/{id} | LabsController_one_v1 | body= False | responses= 200`
- `12: POST /api/v1/labs/bookings | LabsController_book_v1 | body= False | responses= 201`
### auth_ownership
- `134: POST /api/v1/insurance/claims/{id}/approve | AdminInsuranceClaimsController_approve_v1 | body= False | responses= 201`
- `135: POST /api/v1/insurance/claims/{id}/reject | AdminInsuranceClaimsController_reject_v1 | body= False | responses= 201`
### state_transitions
- `15: POST /api/v1/labs/bookings/{id}/cancel | LabsController_cancel_v1 | body= False | responses= 201`
- `16: PATCH /api/v1/labs/bookings/{id}/state | LabsController_transition_v1 | body= False | responses= 200`
- `53: POST /api/v1/health/reminders/{id}/refill/cancel | HealthModuleController_refillCancel_v1 | body= False | responses= 201`
- `75: POST /api/v1/radiology/bookings/{id}/cancel | RadiologyController_cancel_v1 | body= False | responses= 201`
- `76: PATCH /api/v1/radiology/bookings/{id}/state | RadiologyController_transition_v1 | body= False | responses= 200`
- `98: POST /api/v1/patient/pharmacy/orders/{id}/cancel | PatientPharmacyController_cancel_v1 | body= False | responses= 201`
- `124: POST /api/v1/insurance/requests/{id}/cancel | InsuranceFlowController_cancel_v1 | body= False | responses= 201`
### payment_insurance_relevance
- `3: GET /api/v1/users/me/insurance | UsersInsuranceController_getInsurance_v1 | body= False | responses= 200`
- `4: POST /api/v1/users/me/insurance | UsersInsuranceController_updateInsurance_v1 | body= False | responses= 201`
- `5: PATCH /api/v1/orders/{id}/insurance-approval | OrdersController_updateInsuranceApproval_v1 | body= False | responses= 200`
- `6: POST /api/v1/pharmacy/orders/{id}/insurance | PharmacyOpsController_setInsurance_v1 | body= False | responses= 201`
- `7: GET /api/v1/care/insurance | CareController_insuranceCompanies_v1 | body= False | responses= 200`
- `18: PATCH /api/v1/labs/bookings/{id}/insurance | LabsController_updateIns_v1 | body= False | responses= 200`
- `19: PATCH /api/v1/labs/bookings/{id}/items/{serviceId}/opt-in-cash | LabsController_optInCash_v1 | body= False | responses= 200`
- `38: GET /api/v1/labs/bookings/wallet | LabsEngineController_getWallet_v1 | body= False | responses= 200`
- `80: PATCH /api/v1/radiology/bookings/{id}/insurance | RadiologyController_updateIns_v1 | body= False | responses= 200`
- `88: POST /api/v1/radiology/bookings/{id}/insurance-approval | RadiologyController_insuranceApproval_v1 | body= False | responses= 201`
- `100: GET /api/v1/insurance/companies | InsuranceFlowController_companies_v1 | body= False | responses= 200`
- `101: POST /api/v1/insurance/companies | InsuranceController_createCompany_v1 | body= False | responses= 201`
### error_empty_loading_retry_cancel
- `15: POST /api/v1/labs/bookings/{id}/cancel | LabsController_cancel_v1 | body= False | responses= 201`
- `53: POST /api/v1/health/reminders/{id}/refill/cancel | HealthModuleController_refillCancel_v1 | body= False | responses= 201`
- `75: POST /api/v1/radiology/bookings/{id}/cancel | RadiologyController_cancel_v1 | body= False | responses= 201`
- `85: POST /api/v1/radiology/bookings/{id}/abort | RadiologyController_abortScan_v1 | body= False | responses= 201`
- `98: POST /api/v1/patient/pharmacy/orders/{id}/cancel | PatientPharmacyController_cancel_v1 | body= False | responses= 201`
- `124: POST /api/v1/insurance/requests/{id}/cancel | InsuranceFlowController_cancel_v1 | body= False | responses= 201`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
