# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `app.json`
- **Member SHA-256:** `a2b9a86e0c5238e73a8f9d6b1b98b5d7369b3b841146ae2137134e31cfd54b02`
- **Line count:** 149
- **Read range:** `1-149`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `103: "expo-router",`
- `135: "expo-splash-screen",`
- `146: "typedRoutes": true`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `54: "permissions": [`
- `55: "android.permission.CAMERA",`
- `56: "android.permission.READ_EXTERNAL_STORAGE",`
- `57: "android.permission.WRITE_EXTERNAL_STORAGE",`
- `58: "android.permission.ACCESS_FINE_LOCATION",`
- `59: "android.permission.ACCESS_COARSE_LOCATION",`
- `60: "android.permission.RECORD_AUDIO",`
- `61: "android.permission.USE_FINGERPRINT",`
- `62: "android.permission.USE_BIOMETRIC",`
- `63: "android.permission.VIBRATE",`
- `64: "android.permission.RECEIVE_BOOT_COMPLETED",`
- `65: "android.permission.POST_NOTIFICATIONS",`
### state_transitions
- `64: "android.permission.RECEIVE_BOOT_COMPLETED",`
- `69: "android.permission.READ_PHONE_STATE",`
- `142: "expo-status-bar",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
