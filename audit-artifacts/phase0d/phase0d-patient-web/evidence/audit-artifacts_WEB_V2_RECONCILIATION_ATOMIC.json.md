# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_RECONCILIATION_ATOMIC.json`
- **Member SHA-256:** `a7e50216538ab7d23d7a96131a9688460367c3519bf652d7eb7d47876a612140`
- **Line count:** 2313
- **Read range:** `1-2313`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: "mobile_route_candidates": 293,`
- `8: "web_route_files": 52,`
- `12: "mobile_route_candidates": [`
- `15: "app/(auth)/login.tsx",`
- `19: "app/(auth)/register.tsx",`
- `45: "app/articles/bookmarks.tsx",`
- `51: "app/consultations/book/[id].tsx",`
- `52: "app/consultations/booking-confirm.tsx",`
- `53: "app/consultations/booking-pending.tsx",`
- `54: "app/consultations/booking-success.tsx",`
- `56: "app/consultations/cancel-reschedule.tsx",`
- `78: "app/diagnostics/book-sample.tsx",`
### backend_consumers_or_contracts
- `32: "app/(tabs)/nursing.tsx",`
- `33: "app/(tabs)/pharmacy.tsx",`
- `50: "app/consultations/appointments.tsx",`
- `83: "app/diagnostics/insurance-approval.tsx",`
- `84: "app/diagnostics/insurance-upload.tsx",`
- `89: "app/diagnostics/orders.tsx",`
- `142: "app/insurance/add-policy.tsx",`
- `143: "app/insurance/approval-pending.tsx",`
- `144: "app/insurance/benefits-summary.tsx",`
- `145: "app/insurance/claim-tracking.tsx",`
- `146: "app/insurance/copay.tsx",`
- `147: "app/insurance/coverage-check.tsx",`
### auth_ownership
- `15: "app/(auth)/login.tsx",`
- `16: "app/(auth)/otp.tsx",`
- `26: "app/(onboarding)/permissions.tsx",`
- `111: "app/family/permission-request.tsx",`
- `112: "app/family/permissions.tsx",`
- `291: "src/design-system/components/OTPInput.tsx",`
- `301: "src/navigation/guards/AdminGuard.tsx",`
- `333: "[locale]/login/page.tsx",`
- `353: "api/auth/login/route.ts",`
- `354: "api/auth/logout/route.ts",`
- `355: "api/auth/session/route.ts",`
- `445: "text": "await HttpClient.post('/notifications/register-token', {"`
### state_transitions
- `53: "app/consultations/booking-pending.tsx",`
- `54: "app/consultations/booking-success.tsx",`
- `56: "app/consultations/cancel-reschedule.tsx",`
- `80: "app/diagnostics/booking-success.tsx",`
- `143: "app/insurance/approval-pending.tsx",`
- `153: "app/insurance/refund-status.tsx",`
- `196: "app/payments/failed.tsx",`
- `199: "app/payments/success.tsx",`
- `201: "app/pharmacy/broadcast-status.tsx",`
- `275: "src/components/ScreenStates.tsx",`
- `290: "src/design-system/components/Loading.tsx",`
- `294: "src/design-system/components/States.tsx",`
### payment_insurance_relevance
- `67: "app/consultations/offer/[id].tsx",`
- `83: "app/diagnostics/insurance-approval.tsx",`
- `84: "app/diagnostics/insurance-upload.tsx",`
- `142: "app/insurance/add-policy.tsx",`
- `143: "app/insurance/approval-pending.tsx",`
- `144: "app/insurance/benefits-summary.tsx",`
- `145: "app/insurance/claim-tracking.tsx",`
- `146: "app/insurance/copay.tsx",`
- `147: "app/insurance/coverage-check.tsx",`
- `148: "app/insurance/hub.tsx",`
- `149: "app/insurance/index.tsx",`
- `150: "app/insurance/network-providers.tsx",`
### error_empty_loading_retry_cancel
- `53: "app/consultations/booking-pending.tsx",`
- `56: "app/consultations/cancel-reschedule.tsx",`
- `143: "app/insurance/approval-pending.tsx",`
- `196: "app/payments/failed.tsx",`
- `272: "src/components/OfflineBanner.tsx",`
- `290: "src/design-system/components/Loading.tsx",`
- `303: "src/services/ErrorHandler.tsx",`
- `400: "text": "import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';"`
- `420: "text": "async (error: AxiosError) => {"`
- `425: "text": "const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };"`
- `430: "text": "const config = error.config as InternalAxiosRequestConfig;"`
- `453: "file": "src/hooks/useOfflineData.ts",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
