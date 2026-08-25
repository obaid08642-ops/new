# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_QA_ROUTE_BUTTON_INVENTORY_20260818.txt`
- **Member SHA-256:** `31582092e1eb7db3b68605e0717c80ec1f9e74b179f895f9d902140084a1ad8d`
- **Line count:** 567
- **Read range:** `1-567`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: ## route files`
- `7: app/(auth)/login.tsx`
- `11: app/(auth)/register.tsx`
- `37: app/articles/bookmarks.tsx`
- `43: app/consultations/book/[id].tsx`
- `44: app/consultations/booking-confirm.tsx`
- `45: app/consultations/booking-pending.tsx`
- `46: app/consultations/booking-success.tsx`
- `48: app/consultations/cancel-reschedule.tsx`
- `70: app/diagnostics/book-sample.tsx`
- `71: app/diagnostics/booking-confirm.tsx`
- `72: app/diagnostics/booking-success.tsx`
### backend_consumers_or_contracts
- `24: app/(tabs)/nursing.tsx`
- `25: app/(tabs)/pharmacy.tsx`
- `42: app/consultations/appointments.tsx`
- `75: app/diagnostics/insurance-approval.tsx`
- `76: app/diagnostics/insurance-upload.tsx`
- `81: app/diagnostics/orders.tsx`
- `134: app/insurance/add-policy.tsx`
- `135: app/insurance/approval-pending.tsx`
- `136: app/insurance/benefits-summary.tsx`
- `137: app/insurance/claim-tracking.tsx`
- `138: app/insurance/copay.tsx`
- `139: app/insurance/coverage-check.tsx`
### auth_ownership
- `7: app/(auth)/login.tsx`
- `8: app/(auth)/otp.tsx`
- `18: app/(onboarding)/permissions.tsx`
- `103: app/family/permission-request.tsx`
- `104: app/family/permissions.tsx`
- `257: fetch(`${BASE_URL}/auth/refresh`, {`
- `391: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/login.tsx:246:              placeholder="example@mail.com"`
- `392: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/login.tsx:247:              placeholderTextColor={resolveColor('var(--t3)', isDark)}`
- `393: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/login.tsx:266:              placeholder="••••••••"`
- `394: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/login.tsx:267:              placeholderTextColor={resolveColor('var(--t3)', isDark)}`
- `403: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(auth)/otp.tsx:78:      // M1: backend returns { ok: true } from /auth/verify-otp (older mocks used `verified`)`
- `539: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/__tests__/auth/SessionManager.test.ts:5:  let mockSecureStorage: any;`
### state_transitions
- `45: app/consultations/booking-pending.tsx`
- `46: app/consultations/booking-success.tsx`
- `48: app/consultations/cancel-reschedule.tsx`
- `72: app/diagnostics/booking-success.tsx`
- `135: app/insurance/approval-pending.tsx`
- `145: app/insurance/refund-status.tsx`
- `188: app/payments/failed.tsx`
- `191: app/payments/success.tsx`
- `193: app/pharmacy/broadcast-status.tsx`
- `342: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/body-target.tsx:93:          <Input value={targetWeight} onChangeText={setTargetWeight} placeholder="الوزن المستهدف (كغ)" keyboardType="numeric" icon="success" />`
- `346: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/nutrition/ai-plan-builder.tsx:120:              <Input value={form.targetWeight} onChangeText={v => set('targetWeight', v)} placeholder="الوزن المستهدف" keyboardType="numeric" ico`
- `369: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/delivery/address-select.tsx:42:        // No mock fallback — show the honest empty state`
### payment_insurance_relevance
- `59: app/consultations/offer/[id].tsx`
- `75: app/diagnostics/insurance-approval.tsx`
- `76: app/diagnostics/insurance-upload.tsx`
- `134: app/insurance/add-policy.tsx`
- `135: app/insurance/approval-pending.tsx`
- `136: app/insurance/benefits-summary.tsx`
- `137: app/insurance/claim-tracking.tsx`
- `138: app/insurance/copay.tsx`
- `139: app/insurance/coverage-check.tsx`
- `140: app/insurance/hub.tsx`
- `141: app/insurance/index.tsx`
- `142: app/insurance/network-providers.tsx`
### error_empty_loading_retry_cancel
- `45: app/consultations/booking-pending.tsx`
- `48: app/consultations/cancel-reschedule.tsx`
- `135: app/insurance/approval-pending.tsx`
- `188: app/payments/failed.tsx`
- `362: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/(tabs)/pharmacy.tsx:136:          // Offline — cached copy (if any) already shown above; never mock data`
- `369: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/delivery/address-select.tsx:42:        // No mock fallback — show the honest empty state`
- `453: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/docs/PHASE_1A_VALIDATION_REPORT.md:64:- **TODO Items**: `OfflineQueueManager` needs background sync hook (Phase 1C).`
- `527: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/src/design-system/components/Loading.tsx:76:// DS Skeleton — Shimmer placeholder for content loading`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
