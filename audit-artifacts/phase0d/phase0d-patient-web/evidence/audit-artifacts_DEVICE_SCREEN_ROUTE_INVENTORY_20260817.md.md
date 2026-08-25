# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md`
- **Member SHA-256:** `1ac02634e14893c645fd99d0affc76d8af52c24527bea977269067c3822446eb`
- **Line count:** 316
- **Read range:** `1-316`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: ## Patient routes`
- `8: - (auth)/login`
- `12: - (auth)/register`
- `38: - articles/bookmarks`
- `44: - consultations/book/[id]`
- `45: - consultations/booking-confirm`
- `46: - consultations/booking-pending`
- `47: - consultations/booking-success`
- `49: - consultations/cancel-reschedule`
- `71: - diagnostics/book-sample`
- `72: - diagnostics/booking-confirm`
- `73: - diagnostics/booking-success`
### backend_consumers_or_contracts
- `25: - (tabs)/nursing`
- `26: - (tabs)/pharmacy`
- `43: - consultations/appointments`
- `76: - diagnostics/insurance-approval`
- `77: - diagnostics/insurance-upload`
- `82: - diagnostics/orders`
- `218: - profile/insurance`
- `239: - settings/notifications`
- `240: - settings/notifications-settings`
- `259: - auth/AuthScreens`
- `284: - nursing/NursingDashboard`
- `285: - nursing/NursingFieldOps`
### auth_ownership
- `8: - (auth)/login`
- `9: - (auth)/otp`
- `19: - (onboarding)/permissions`
- `104: - family/permission-request`
- `105: - family/permissions`
### state_transitions
- `46: - consultations/booking-pending`
- `47: - consultations/booking-success`
- `49: - consultations/cancel-reschedule`
- `73: - diagnostics/booking-success`
- `136: - insurance/approval-pending`
- `146: - insurance/refund-status`
- `189: - payments/failed`
- `192: - payments/success`
- `194: - pharmacy/broadcast-status`
- `260: - auth/PendingDashboard`
- `296: - shared/RegistrationSuccess`
### payment_insurance_relevance
- `60: - consultations/offer/[id]`
- `76: - diagnostics/insurance-approval`
- `77: - diagnostics/insurance-upload`
- `135: - insurance/add-policy`
- `136: - insurance/approval-pending`
- `137: - insurance/benefits-summary`
- `138: - insurance/claim-tracking`
- `139: - insurance/copay`
- `140: - insurance/coverage-check`
- `141: - insurance/hub`
- `142: - insurance/index`
- `143: - insurance/network-providers`
### error_empty_loading_retry_cancel
- `46: - consultations/booking-pending`
- `49: - consultations/cancel-reschedule`
- `136: - insurance/approval-pending`
- `189: - payments/failed`
- `260: - auth/PendingDashboard`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
