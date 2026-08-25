# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/mobile_screen_files.txt`
- **Member SHA-256:** `5a946ab200a74c5a83afdf746a59832697fcaff68f1bfe96bef57128a651ce8e`
- **Line count:** 261
- **Read range:** `1-261`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/register.tsx`
- `32: /home/ubuntu/nabdah_review/extracted/mobile/app/articles/bookmarks.tsx`
- `38: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/book/[id].tsx`
- `39: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-confirm.tsx`
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-success.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `65: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/book-sample.tsx`
- `66: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-confirm.tsx`
- `67: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-success.tsx`
- `69: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/checkout.tsx`
### backend_consumers_or_contracts
- `20: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/nursing.tsx`
- `21: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/pharmacy.tsx`
- `37: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/appointments.tsx`
- `70: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx`
- `76: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx`
- `129: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `130: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `131: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `132: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
### auth_ownership
- `3: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx`
- `4: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/otp.tsx`
- `14: /home/ubuntu/nabdah_review/extracted/mobile/app/(onboarding)/permissions.tsx`
- `98: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx`
- `99: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx`
### state_transitions
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-success.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `67: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-success.tsx`
- `130: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `140: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
- `184: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx`
- `187: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx`
- `189: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/broadcast-status.tsx`
- `258: /home/ubuntu/nabdah_review/extracted/mobile/src/components/ScreenStates.tsx`
### payment_insurance_relevance
- `54: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/offer/[id].tsx`
- `70: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx`
- `129: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `130: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `131: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `132: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
- `135: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/hub.tsx`
- `136: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/index.tsx`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/network-providers.tsx`
### error_empty_loading_retry_cancel
- `40: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `130: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `184: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx`
- `255: /home/ubuntu/nabdah_review/extracted/mobile/src/components/OfflineBanner.tsx`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
