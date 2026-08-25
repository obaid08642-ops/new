# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/provider_admin_insurance_screen_source_classification_20260820.txt`
- **Member SHA-256:** `aa3aa000e8e5d8ccbb2cb8c0be443ced1e5a65110582075bef1b1117b3c3a20b`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: provider/src/screens/lab/LabRegistration.tsx | catalog_api=yes | static_candidate=no | any_api=no`
- `5: provider/src/screens/lab/LabDashboard.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `6: provider/src/screens/auth/AuthScreens.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `7: provider/src/screens/facility/FacilityRegistration.tsx | catalog_api=yes | static_candidate=no | any_api=no`
- `8: provider/src/screens/facility/FacilityInvitationScreen.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `9: provider/src/screens/facility/FacilityDashboard.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `10: provider/src/screens/ambulance/AmbulanceRegistration.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `11: provider/src/screens/shared/InsuranceRequestsScreen.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `12: provider/src/screens/shared/BlueprintScreens.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `13: provider/src/screens/shared/VideoCallRoom.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `14: provider/src/screens/shared/RealScreensExtended.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `15: provider/src/screens/shared/SharedScreens.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
### backend_consumers_or_contracts
- `6: provider/src/screens/auth/AuthScreens.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `11: provider/src/screens/shared/InsuranceRequestsScreen.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `16: provider/src/screens/nursing/NursingDashboard.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `17: provider/src/screens/nursing/NursingRegistration.tsx | catalog_api=yes | static_candidate=no | any_api=no`
- `21: provider/src/screens/radiology/RadiologyRegistration.tsx | catalog_api=yes | static_candidate=no | any_api=no`
- `22: provider/src/screens/radiology/RadiologyDashboard.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `23: provider/src/screens/pharmacy/PharmacyDashboard.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `24: provider/src/screens/pharmacy/PharmacyRegistration.tsx | catalog_api=yes | static_candidate=no | any_api=no`
- `25: provider/src/api/catalogs.ts | catalog_api=yes | static_candidate=no | any_api=yes`
- `36: admin/src/pages/admin/insurance-queue.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `37: admin/src/pages/admin/insurance-companies.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
### auth_ownership
- `34: ===== admin =====`
- `35: admin/src/pages/admin/legal-policies.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `36: admin/src/pages/admin/insurance-queue.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `37: admin/src/pages/admin/insurance-companies.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `38: admin/src/components/AdminGuard.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `39: admin/src/components/ProviderFullDetail.tsx | catalog_api=no | static_candidate=no | any_api=no`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `11: provider/src/screens/shared/InsuranceRequestsScreen.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `36: admin/src/pages/admin/insurance-queue.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `37: admin/src/pages/admin/insurance-companies.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
