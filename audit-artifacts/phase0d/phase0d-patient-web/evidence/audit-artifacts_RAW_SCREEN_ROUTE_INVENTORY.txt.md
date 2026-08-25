# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/RAW_SCREEN_ROUTE_INVENTORY.txt`
- **Member SHA-256:** `9f061800aec3050e29139fefa23d068a4b5a37ad013025374ff7d625b86266cd`
- **Line count:** 282
- **Read range:** `1-282`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx`
- `10: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/register.tsx`
- `36: /home/ubuntu/nabdah_review/extracted/mobile/app/articles/bookmarks.tsx`
- `42: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/book/[id].tsx`
- `43: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-confirm.tsx`
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-success.tsx`
- `47: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `69: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/book-sample.tsx`
- `70: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-confirm.tsx`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-success.tsx`
- `73: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/checkout.tsx`
### backend_consumers_or_contracts
- `23: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/nursing.tsx`
- `24: /home/ubuntu/nabdah_review/extracted/mobile/app/(tabs)/pharmacy.tsx`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/appointments.tsx`
- `74: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx`
- `80: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `135: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `136: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `138: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
### auth_ownership
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/login.tsx`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/(auth)/otp.tsx`
- `17: /home/ubuntu/nabdah_review/extracted/mobile/app/(onboarding)/permissions.tsx`
- `102: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permission-request.tsx`
- `103: /home/ubuntu/nabdah_review/extracted/mobile/app/family/permissions.tsx`
- `265: app/[locale]/login/page.tsx`
- `277: app/api/auth/login/route.ts`
- `278: app/api/auth/logout/route.ts`
- `279: app/api/auth/session/route.ts`
### state_transitions
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `45: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-success.tsx`
- `47: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `71: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/booking-success.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `144: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/refund-status.tsx`
- `188: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx`
- `191: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/success.tsx`
- `193: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/broadcast-status.tsx`
### payment_insurance_relevance
- `58: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/offer/[id].tsx`
- `74: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx`
- `75: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx`
- `133: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/add-policy.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `135: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/benefits-summary.tsx`
- `136: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/claim-tracking.tsx`
- `137: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/copay.tsx`
- `138: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/coverage-check.tsx`
- `139: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/hub.tsx`
- `140: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/index.tsx`
- `141: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/network-providers.tsx`
### error_empty_loading_retry_cancel
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/booking-pending.tsx`
- `47: /home/ubuntu/nabdah_review/extracted/mobile/app/consultations/cancel-reschedule.tsx`
- `134: /home/ubuntu/nabdah_review/extracted/mobile/app/insurance/approval-pending.tsx`
- `188: /home/ubuntu/nabdah_review/extracted/mobile/app/payments/failed.tsx`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
