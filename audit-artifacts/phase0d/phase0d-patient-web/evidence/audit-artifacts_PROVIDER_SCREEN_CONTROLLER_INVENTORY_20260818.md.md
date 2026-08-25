# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_SCREEN_CONTROLLER_INVENTORY_20260818.md`
- **Member SHA-256:** `55f274ffbaa5e279ada6d82c47c7c3f52c729670c96ea2d41e9b399a82d95694`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Provider screen/controller inventory`
- `3: ## Provider app screens`
- `4: provider-app/src/screens/ambulance/AmbulanceDashboard.tsx`
- `5: provider-app/src/screens/ambulance/AmbulanceRegistration.tsx`
- `6: provider-app/src/screens/auth/AuthScreens.tsx`
- `7: provider-app/src/screens/auth/PendingDashboard.tsx`
- `8: provider-app/src/screens/doctor/DoctorDashboard.tsx`
- `9: provider-app/src/screens/doctor/DoctorOpsScreens.tsx`
- `10: provider-app/src/screens/doctor/DoctorRegistration.tsx`
- `11: provider-app/src/screens/doctor/FacilityInvitationsScreen.tsx`
- `12: provider-app/src/screens/doctor/components/DoctorHeader.tsx`
- `13: provider-app/src/screens/doctor/components/DoctorQueueList.tsx`
### backend_consumers_or_contracts
- `6: provider-app/src/screens/auth/AuthScreens.tsx`
- `7: provider-app/src/screens/auth/PendingDashboard.tsx`
- `31: provider-app/src/screens/nursing/NursingDashboard.tsx`
- `32: provider-app/src/screens/nursing/NursingFieldOps.tsx`
- `33: provider-app/src/screens/nursing/NursingRegistration.tsx`
- `34: provider-app/src/screens/pharmacy/PharmacyDashboard.tsx`
- `35: provider-app/src/screens/pharmacy/PharmacyRegistration.tsx`
- `36: provider-app/src/screens/radiology/RadiologyDashboard.tsx`
- `37: provider-app/src/screens/radiology/RadiologyRegistration.tsx`
- `40: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx`
- `47: ## Provider app API/client files`
- `48: provider-app/src/api/catalogs.ts`
### auth_ownership
- `50: provider-app/src/api/otp.ts`
- `55: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/admin-web-core/controllers/provider-moderation.controller.ts`
### state_transitions
- `7: provider-app/src/screens/auth/PendingDashboard.tsx`
- `43: provider-app/src/screens/shared/RegistrationSuccess.tsx`
### payment_insurance_relevance
- `40: provider-app/src/screens/shared/InsuranceRequestsScreen.tsx`
- `57: /tmp/nabdah-appointment-work/nabdah-backend/src/modules/payouts/provider-payouts.controller.ts`
### error_empty_loading_retry_cancel
- `7: provider-app/src/screens/auth/PendingDashboard.tsx`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
