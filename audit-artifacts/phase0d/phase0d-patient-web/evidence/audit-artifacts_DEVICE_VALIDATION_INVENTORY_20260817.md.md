# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEVICE_VALIDATION_INVENTORY_20260817.md`
- **Member SHA-256:** `82fd1d945f0f00442ad2ffc4fe76f64e0b7943c485b3e8341b3ba556947e4830`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: تم فحص checkout الحاكم `manus/on-live-reconciliation` والأرشيفين `nabd_plus_patient_app.zip` و`NabdProvider-provider.zip` دون تعديل ملفات المصدر أو أسرار البيئة. كلا التطبيقين مبنيان على Expo SDK 54 وReact Native 0.81، ويحتويان على إعدادات `
- `38: تم اختبار مسار EAS cloud build غير التفاعلي للتطبيقين، وأعاد CLI: `An Expo user account is required ... eas login or EXPO_TOKEN`. لم يتم تسجيل الدخول أو إرسال token أو بدء build سحابي. لذلك بناء APK قابل للتنزيل ينتظر اعتماد Expo/EAS من الم`
### backend_consumers_or_contracts
- `21: تم العثور على endpoint إنتاج صحيح في إعدادات patient/provider: `https://api.nabd.plus/api/v1`. توجد في provider بعض مراجع API قديمة/بديلة ضمن كود الإعداد، ولذلك لا يُغلق بند build-to-production قبل مراجعة أن المستهلك الفعلي يستخدم `API_BASE`
### auth_ownership
- `38: تم اختبار مسار EAS cloud build غير التفاعلي للتطبيقين، وأعاد CLI: `An Expo user account is required ... eas login or EXPO_TOKEN`. لم يتم تسجيل الدخول أو إرسال token أو بدء build سحابي. لذلك بناء APK قابل للتنزيل ينتظر اعتماد Expo/EAS من الم`
### state_transitions
- `36: نجح `expo config --json` و`expo prebuild --no-install` للتطبيقين في مساحة مؤقتة، مع توليد native directories. لكن `expo run:android --no-install` فشل للتطبيقين قبل Gradle لأن Android SDK غير موجود و`adb` غير متاح (`Failed to resolve the And`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `36: نجح `expo config --json` و`expo prebuild --no-install` للتطبيقين في مساحة مؤقتة، مع توليد native directories. لكن `expo run:android --no-install` فشل للتطبيقين قبل Gradle لأن Android SDK غير موجود و`adb` غير متاح (`Failed to resolve the And`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
