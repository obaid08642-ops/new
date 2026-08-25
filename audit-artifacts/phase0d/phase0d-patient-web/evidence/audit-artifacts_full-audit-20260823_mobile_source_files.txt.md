# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/mobile_source_files.txt`
- **Member SHA-256:** `7f6abe8754c6f4918d518a513b7903ab4f7cfb5231586fa313af28c29c20ddcd`
- **Line count:** 537
- **Read range:** `1-537`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/register.tsx`
- `34: /home/ubuntu/nabdah_review/extracted/mobile/app/articles/bookmarks.tsx`
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/book/[id].tsx`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-confirm.tsx`
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-success.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `67: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/book-sample.tsx`
- `68: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-confirm.tsx`
- `69: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-success.tsx`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/checkout.tsx`
### backend_consumers_or_contracts
- `21: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/nursing.tsx`
- `22: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/pharmacy.tsx`
- `39: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/appointments.tsx`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx`
- `78: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx`
- `131: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `132: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `135: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `136: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
### auth_ownership
- `4: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx`
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/otp.tsx`
- `15: /home/ubuntu/nabdah_review/extracted/mobile/app/(onboarding)/permissions.tsx`
- `100: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx`
- `101: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx`
- `260: /home/ubuntu/nabdah_review/extracted/mobile/src/__tests__/auth/SessionManager.test.ts`
- `327: /home/ubuntu/nabdah_review/extracted/mobile/src/core/platform/auth/SessionManager.ts`
- `346: /home/ubuntu/nabdah_review/extracted/mobile/src/core/platform/user/RoleManager.ts`
- `392: /home/ubuntu/nabdah_review/extracted/mobile/src/design-system/components/OTPInput.tsx`
- `399: /home/ubuntu/nabdah_review/extracted/mobile/src/design-system/tokens.ts`
- `434: /home/ubuntu/nabdah_review/extracted/mobile/src/navigation/guards/AdminGuard.tsx`
- `446: /home/ubuntu/nabdah_review/extracted/mobile/src/services/PermissionsManager.ts`
### state_transitions
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-success.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `69: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-success.tsx`
- `132: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `142: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
- `186: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx`
- `189: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx`
- `191: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/broadcast-status.tsx`
- `277: /home/ubuntu/nabdah_review/extracted/mobile/src/components/ScreenStates.tsx`
- `311: /home/ubuntu/nabdah_review/extracted/mobile/src/core/domain/errors/index.ts`
- `322: /home/ubuntu/nabdah_review/extracted/mobile/src/core/platform/auth/AuthStateMachine.ts`
### payment_insurance_relevance
- `56: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/offer/[id].tsx`
- `72: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx`
- `131: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `132: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `135: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `136: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/hub.tsx`
- `138: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/index.tsx`
- `139: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/network-providers.tsx`
### error_empty_loading_retry_cancel
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `132: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `186: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx`
- `274: /home/ubuntu/nabdah_review/extracted/mobile/src/components/OfflineBanner.tsx`
- `311: /home/ubuntu/nabdah_review/extracted/mobile/src/core/domain/errors/index.ts`
- `381: /home/ubuntu/nabdah_review/extracted/mobile/src/data/sync/RetryScheduler.ts`
- `391: /home/ubuntu/nabdah_review/extracted/mobile/src/design-system/components/Loading.tsx`
- `414: /home/ubuntu/nabdah_review/extracted/mobile/src/hooks/useOfflineData.ts`
- `439: /home/ubuntu/nabdah_review/extracted/mobile/src/services/ErrorHandler.tsx`
- `463: /home/ubuntu/nabdah_review/extracted/mobile/src/store/api/offlineHelpers.ts`
- `529: /home/ubuntu/nabdah_review/extracted/mobile/src/utils/offlineQueue.ts`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
