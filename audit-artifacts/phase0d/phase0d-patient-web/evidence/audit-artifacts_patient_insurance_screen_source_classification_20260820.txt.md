# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/patient_insurance_screen_source_classification_20260820.txt`
- **Member SHA-256:** `edfa873587e666fbf3d75b28fc5256f3a8b84cd1823866327135d1bc7e293ffe`
- **Line count:** 83
- **Read range:** `1-83`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: app/diagnostics/insurance-upload.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `7: app/diagnostics/booking-confirm.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `24: app/consultations/booking-success.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `27: app/consultations/booking-confirm.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `28: app/consultations/booking-pending.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `30: app/consultations/cancel-reschedule.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `38: app/pharmacy/checkout.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `39: app/insurance/submit-claim.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `46: app/insurance/refund-status.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `56: src/features/consultation/InsuranceCopayScreen.tsx | catalog_api=no | static_candidate=no | any_api=no`
### backend_consumers_or_contracts
- `2: app/profile/insurance.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `5: app/diagnostics/insurance-approval.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `6: app/diagnostics/insurance-upload.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `11: app/orders/index.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `12: app/nursing/service-info.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `13: app/nursing/service-details.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `14: app/nursing/nurse-profile.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `21: app/(tabs)/nursing.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `36: app/pharmacy/payment.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `37: app/pharmacy/rx-order.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `38: app/pharmacy/checkout.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `39: app/insurance/submit-claim.tsx | catalog_api=no | static_candidate=no | any_api=yes`
### auth_ownership
- `17: app/family/permissions.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `77: src/core/platform/user/RoleManager.ts | catalog_api=no | static_candidate=no | any_api=no`
### state_transitions
- `24: app/consultations/booking-success.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `28: app/consultations/booking-pending.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `30: app/consultations/cancel-reschedule.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `46: app/insurance/refund-status.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `51: app/insurance/approval-pending.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `57: src/design-system/components/States.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `63: src/services/ErrorHandler.tsx | catalog_api=no | static_candidate=no | any_api=no`
### payment_insurance_relevance
- `2: app/profile/insurance.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `5: app/diagnostics/insurance-approval.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `6: app/diagnostics/insurance-upload.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `15: app/payments/processing.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `36: app/pharmacy/payment.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `39: app/insurance/submit-claim.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `40: app/insurance/benefits-summary.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `41: app/insurance/index.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `42: app/insurance/hub.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `43: app/insurance/network-providers.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `44: app/insurance/add-policy.tsx | catalog_api=yes | static_candidate=no | any_api=yes`
- `45: app/insurance/claim-tracking.tsx | catalog_api=no | static_candidate=no | any_api=yes`
### error_empty_loading_retry_cancel
- `28: app/consultations/booking-pending.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `30: app/consultations/cancel-reschedule.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `51: app/insurance/approval-pending.tsx | catalog_api=no | static_candidate=no | any_api=yes`
- `63: src/services/ErrorHandler.tsx | catalog_api=no | static_candidate=no | any_api=no`
- `64: src/hooks/useOfflineData.ts | catalog_api=no | static_candidate=no | any_api=yes`
- `79: src/store/api/offlineHelpers.ts | catalog_api=no | static_candidate=no | any_api=no`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
