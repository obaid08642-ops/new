# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PATIENT_CONSULTATION_CONSUMER_MAP_20260818.txt`
- **Member SHA-256:** `8abf63f1d1879479763f611c56048f960a428ed2be27a0167f2a3141b8511e6e`
- **Line count:** 854
- **Read range:** `1-854`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: app/(auth)/login.tsx`
- `9: app/(auth)/register.tsx`
- `35: app/articles/bookmarks.tsx`
- `41: app/consultations/book/[id].tsx`
- `42: app/consultations/booking-confirm.tsx`
- `43: app/consultations/booking-pending.tsx`
- `44: app/consultations/booking-success.tsx`
- `46: app/consultations/cancel-reschedule.tsx`
- `68: app/diagnostics/book-sample.tsx`
- `69: app/diagnostics/booking-confirm.tsx`
- `70: app/diagnostics/booking-success.tsx`
- `72: app/diagnostics/checkout.tsx`
### backend_consumers_or_contracts
- `22: app/(tabs)/nursing.tsx`
- `23: app/(tabs)/pharmacy.tsx`
- `40: app/consultations/appointments.tsx`
- `73: app/diagnostics/insurance-approval.tsx`
- `74: app/diagnostics/insurance-upload.tsx`
- `79: app/diagnostics/orders.tsx`
- `132: app/insurance/add-policy.tsx`
- `133: app/insurance/approval-pending.tsx`
- `134: app/insurance/benefits-summary.tsx`
- `135: app/insurance/claim-tracking.tsx`
- `136: app/insurance/copay.tsx`
- `137: app/insurance/coverage-check.tsx`
### auth_ownership
- `5: app/(auth)/login.tsx`
- `6: app/(auth)/otp.tsx`
- `16: app/(onboarding)/permissions.tsx`
- `101: app/family/permission-request.tsx`
- `102: app/family/permissions.tsx`
- `290: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/passport.tsx:39:    apiFetch('/medical-profile/passport-token').then(res => setPassportToken(res)).catch(() => setPassportToken(null));`
- `411: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/lab/[id].tsx:29:          apiFetch(`/labs/services?providerId=${id}`)`
- `612: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/mental-health/meditation.tsx:16:// Sessions fetched dynamically`
- `688: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/room/[id].tsx:157:    const fetchToken = async () => {`
- `689: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/room/[id].tsx:168:    if (id) fetchToken();`
### state_transitions
- `43: app/consultations/booking-pending.tsx`
- `44: app/consultations/booking-success.tsx`
- `46: app/consultations/cancel-reschedule.tsx`
- `70: app/diagnostics/booking-success.tsx`
- `133: app/insurance/approval-pending.tsx`
- `143: app/insurance/refund-status.tsx`
- `187: app/payments/failed.tsx`
- `190: app/payments/success.tsx`
- `192: app/pharmacy/broadcast-status.tsx`
- `416: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/booking-success.tsx:88:        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary, marginBottom: 16 }]} onPress={() => router.replace('/diag`
- `417: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/booking-success.tsx:93:        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.primary }]} onPress={() => router.push('/(tabs)')}>`
- `457: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/diagnostics/insurance-upload.tsx:49:        console.log('Error fetching labs', e);`
### payment_insurance_relevance
- `57: app/consultations/offer/[id].tsx`
- `73: app/diagnostics/insurance-approval.tsx`
- `74: app/diagnostics/insurance-upload.tsx`
- `132: app/insurance/add-policy.tsx`
- `133: app/insurance/approval-pending.tsx`
- `134: app/insurance/benefits-summary.tsx`
- `135: app/insurance/claim-tracking.tsx`
- `136: app/insurance/copay.tsx`
- `137: app/insurance/coverage-check.tsx`
- `138: app/insurance/hub.tsx`
- `139: app/insurance/index.tsx`
- `140: app/insurance/network-providers.tsx`
### error_empty_loading_retry_cancel
- `43: app/consultations/booking-pending.tsx`
- `46: app/consultations/cancel-reschedule.tsx`
- `133: app/insurance/approval-pending.tsx`
- `187: app/payments/failed.tsx`
- `289: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/passport.tsx:38:    apiFetch('/medical-profile').then(res => setProfile(res)).catch(() => {});`
- `290: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/reports/passport.tsx:39:    apiFetch('/medical-profile/passport-token').then(res => setPassportToken(res)).catch(() => setPassportToken(null));`
- `319: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/hub.tsx:68:      const configRes = await apiFetch('/loyalty/config').catch(() => null);`
- `320: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/loyalty/hub.tsx:74:      const rewardsRes = await apiFetch('/loyalty/rewards').catch(() => null);`
- `343: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/monthly-report.tsx:37:        apiFetch('/care/appointments').catch(() => []),`
- `344: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/monthly-report.tsx:38:        apiFetch('/health/vitals/summary').catch(() => []),`
- `345: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/monthly-report.tsx:39:        apiFetch('/health/chronic-meds').catch(() => []),`
- `346: /home/ubuntu/nabdah-live-extracted/patient-app/nabd_plus/app/ai/monthly-report.tsx:40:        apiFetch('/health/trends').catch(() => []),`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
