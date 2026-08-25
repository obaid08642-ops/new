# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app/consultations/booking-success.tsx`
- **Member SHA-256:** `53a9136da667815163a044bb02e7cbff71f9fb832a4a7707282b9baa7ce86124`
- **Line count:** 362
- **Read range:** `1-362`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `10: import { router, useLocalSearchParams } from "expo-router";`
- `17: export default function BookingSuccessScreen() {`
- `54: router.push("/(tabs)/consultations");`
- `58: router.push("/consultations/appointments");`
- `62: router.push({`
- `63: pathname: "/consultations/booking-pending",`
- `104: : "Booking Confirmed!";`
- `260: onPress={handleNext}`
- `283: onPress={() => router.push("/(tabs)")}`
### backend_consumers_or_contracts
- `58: router.push("/consultations/appointments");`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: StatusBar,`
- `17: export default function BookingSuccessScreen() {`
- `63: pathname: "/consultations/booking-pending",`
- `71: : "Track Approval Status"`
- `89: ? "hourglass-empty"`
- `98: const statusTitle = isInsurance`
- `104: : "Booking Confirmed!";`
- `106: const statusSubtitle = isInsurance`
- `112: : "Your appointment is confirmed with the doctor";`
- `114: const statusColor = isInsurance`
- `117: const statusIcon = isInsurance ? "schedule" : "check_circle";`
- `121: <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />`
### payment_insurance_relevance
- `25: isInsurance?: string;`
- `30: const isInsurance = params.isInsurance === "true";`
- `53: if (isInsurance) {`
- `68: const nextLabel = isInsurance`
- `88: const nextIcon = isInsurance`
- `98: const statusTitle = isInsurance`
- `106: const statusSubtitle = isInsurance`
- `108: ? "في انتظار الموافقة الطبية لمعرفة نسبة التحمل (Copay)"`
- `109: : "Waiting for medical approval to get Copay amount"`
- `114: const statusColor = isInsurance`
- `117: const statusIcon = isInsurance ? "schedule" : "check_circle";`
- `163: styles.card,`
### error_empty_loading_retry_cancel
- `63: pathname: "/consultations/booking-pending",`
- `89: ? "hourglass-empty"`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
