# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEVICE_AUTOMATED_BUILD_RESULTS_20260817.md`
- **Member SHA-256:** `04fac1c0292e400494ef82d8fee747500755fbcaccc706d7a2d2f1f530f3421d`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: لا يوجد APK/AAB/IPA ناتج من هذه الجولة. لا توجد screenshots أو crash reports من emulator/device farm لأن Android SDK وFirebase/GCP credentials غير متاحة. الأدلة الخام محفوظة بجانب هذه الوثيقة بأسماء `DEVICE_*`.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `11: نجح `expo config --json` و`expo prebuild --no-install`. نجح typecheck و1 suite/3 tests. فشل web export لأن `react-dom` و`react-native-web` غير مثبتين، وهو ليس مسار Android المطلوب. فشل `expo run:android` بسبب غياب Android SDK و`adb`. وفشل E`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
