# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE13_UI_ACTION_INVENTORY_V2_SUMMARY_20260819.md`
- **Member SHA-256:** `dc48f01537dbb0b3780c755b0c708347e213609e54d001527ca88fedc68871e8`
- **Line count:** 64
- **Read range:** `1-64`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: | provider | `src/screens/doctor/DoctorDashboard.tsx` | 101 | 7 | 2 | 48 |`
- `21: | provider | `src/screens/nursing/NursingDashboard.tsx` | 58 | 18 | 1 | 31 |`
- `22: | provider | `src/screens/lab/LabDashboard.tsx` | 69 | 16 | 1 | 28 |`
- `23: | provider | `src/screens/facility/FacilityDashboard.tsx` | 67 | 6 | 1 | 29 |`
- `24: | provider | `src/screens/lab/LabRegistration.tsx` | 46 | 0 | 0 | 33 |`
- `25: | provider | `src/screens/radiology/RadiologyRegistration.tsx` | 46 | 0 | 0 | 33 |`
- `26: | provider | `src/screens/nursing/NursingRegistration.tsx` | 39 | 0 | 0 | 30 |`
- `27: | provider | `src/screens/shared/SharedScreens.tsx` | 78 | 8 | 4 | 21 |`
- `29: | provider | `src/screens/pharmacy/PharmacyRegistration.tsx` | 35 | 0 | 0 | 27 |`
- `30: | provider | `src/screens/pharmacy/PharmacyDashboard.tsx` | 43 | 9 | 0 | 17 |`
- `31: | provider | `src/screens/doctor/DoctorRegistration.tsx` | 37 | 0 | 0 | 23 |`
- `32: | provider | `src/screens/radiology/RadiologyDashboard.tsx` | 36 | 10 | 0 | 13 |`
### backend_consumers_or_contracts
- `21: | provider | `src/screens/nursing/NursingDashboard.tsx` | 58 | 18 | 1 | 31 |`
- `25: | provider | `src/screens/radiology/RadiologyRegistration.tsx` | 46 | 0 | 0 | 33 |`
- `26: | provider | `src/screens/nursing/NursingRegistration.tsx` | 39 | 0 | 0 | 30 |`
- `29: | provider | `src/screens/pharmacy/PharmacyRegistration.tsx` | 35 | 0 | 0 | 27 |`
- `30: | provider | `src/screens/pharmacy/PharmacyDashboard.tsx` | 43 | 9 | 0 | 17 |`
- `32: | provider | `src/screens/radiology/RadiologyDashboard.tsx` | 36 | 10 | 0 | 13 |`
- `36: | provider | `src/screens/auth/AuthScreens.tsx` | 19 | 2 | 0 | 10 |`
- `42: | provider | `src/screens/nursing/NursingFieldOps.tsx` | 9 | 0 | 0 | 5 |`
- `43: | admin | `src/pages/admin/insurance-queue.tsx` | 12 | 0 | 0 | 4 |`
- `56: | provider | `src/screens/auth/PendingDashboard.tsx` | 4 | 1 | 1 | 2 |`
### auth_ownership
- `14: | admin | 6 | 0 | 90 | 0 | 60 |`
- `38: | admin | `src/pages/admin/users-management.tsx` | 10 | 0 | 0 | 8 |`
- `39: | admin | `src/pages/admin/medicines-catalog.tsx` | 14 | 0 | 0 | 6 |`
- `41: | admin | `src/pages/login.tsx` | 10 | 5 | 0 | 0 |`
- `43: | admin | `src/pages/admin/insurance-queue.tsx` | 12 | 0 | 0 | 4 |`
- `46: | admin | `src/pages/admin/sos-monitor.tsx` | 6 | 0 | 0 | 4 |`
- `51: | admin | `src/pages/admin/provider-moderation.tsx` | 10 | 0 | 0 | 3 |`
- `53: | admin | `src/pages/admin/shortage-reports.tsx` | 6 | 0 | 0 | 3 |`
- `55: | admin | `src/pages/admin/ambulance-fleet.tsx` | 5 | 0 | 0 | 3 |`
- `57: | admin | `src/pages/admin/catalog-manager.tsx` | 8 | 0 | 0 | 2 |`
- `58: | admin | `src/pages/admin/dashboard.tsx` | 6 | 0 | 0 | 2 |`
- `59: | admin | `src/pages/admin/payouts.tsx` | 6 | 0 | 0 | 2 |`
### state_transitions
- `49: | patient | `src/design-system/components/States.tsx` | 4 | 0 | 0 | 4 |`
- `50: | provider | `src/screens/shared/RegistrationSuccess.tsx` | 4 | 3 | 0 | 1 |`
- `56: | provider | `src/screens/auth/PendingDashboard.tsx` | 4 | 1 | 1 | 2 |`
### payment_insurance_relevance
- `43: | admin | `src/pages/admin/insurance-queue.tsx` | 12 | 0 | 0 | 4 |`
- `59: | admin | `src/pages/admin/payouts.tsx` | 6 | 0 | 0 | 2 |`
### error_empty_loading_retry_cancel
- `56: | provider | `src/screens/auth/PendingDashboard.tsx` | 4 | 1 | 1 | 2 |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
