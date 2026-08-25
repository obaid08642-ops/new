# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/DEVICE_READINESS_REPORT_20260817.md`
- **Member SHA-256:** `9368a878ec25b985d74d61db4d78bbdddc72c7ef6143b3ad4166f94ccc892e37`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `36: فشلت محاولة `expo run:android --no-install` لكلا التطبيقين قبل Gradle بسبب الرسائل المثبتة: `Failed to resolve the Android SDK path` و`spawn adb ENOENT`. لم يوجد Android SDK أو emulator أو Gradle في sandbox. كما أن EAS cloud build أعاد `An `
- `38: لم تُشغّل Firebase Test Lab لأن Firebase CLI وgcloud غير متاحين ولم توجد بيانات اعتماد GCP أو مشروع billing معتمد. لم تُنتج screenshots أو crash reports من emulator/device farm؛ اختلاق هذه الأدلة غير مقبول.`
- `46: كما تبقى اختبارات الهاتفين الحقيقيين الخاصة بـpush والتطبيق المغلق، deep links، المكالمات الواردة، CallKeep/full-screen intent، LiveKit video الحقيقي، GPS أثناء الحركة، ومراجعة RTL والنصوص المقطوعة مؤجلة للمالك. خطواتها الكاملة موجودة في [``
- `63: بعد توفير المسار، يجب بناء APKs موقعة للاختبار، رفعها إلى مزرعة الأجهزة، حفظ screenshots/videos/logs/crash reports، تنفيذ المصفوفة، ثم إعادة الاختبارات لأي عيب مصدرّي قبل commit/push. لا تُغلق العقود الأربعة الحساسة بهذه الاختبارات؛ تبقى fa`
- `69: 3. [`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md`](DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md) — جرد 249 route للمريض و42 شاشة للمزود.`
### backend_consumers_or_contracts
- `57: | DEVICE-OBS-002 | config review | توجد مراجع API بديلة قديمة في provider؛ يجب تأكيد أن المستهلك الفعلي يستخدم `API_BASE=https://api.nabd.plus/api/v1` في كل مسار | يحتاج مراجعة مصدرية قبل الإطلاق |`
### auth_ownership
- `24: | Real-device tests | Deferred to owner | Deferred to owner | `REAL_DEVICE_CHECKLIST.md` |`
- `36: فشلت محاولة `expo run:android --no-install` لكلا التطبيقين قبل Gradle بسبب الرسائل المثبتة: `Failed to resolve the Android SDK path` و`spawn adb ENOENT`. لم يوجد Android SDK أو emulator أو Gradle في sandbox. كما أن EAS cloud build أعاد `An `
- `44: تبقى المصفوفة التالية بحاجة إلى emulator أو device farm: ثلاثة مقاسات Android على الأقل، اللغات الست واتجاه RTL/LTR لكل شاشة، المسارات الطويلة للدواء والاستشارة والمختبر والأشعة والتمريض، 3G وانقطاع متقطع، mock location، orientation، lifecy`
- `53: | DEVICE-BLOCKER-002 | اعتماد | EAS CLI غير authenticated ولا يوجد Expo token | مفتوح ويحتاج اعتماد المالك |`
### state_transitions
- `9: بناءً عليه، **لا يجوز اعتبار مرحلة اختبار الأجهزة مغلقة، ولا يجوز تسليم هذه الجولة كدليل جاهزية المتاجر**. الجاهزية المصدرية جيدة، أما جاهزية الأجهزة والمتجر فما زالت pending حتى توفير مسار بناء native ومزرعة أجهزة أو تنفيذها في بيئة خارجية`
- `19: | Web/JS export | Passed؛ web + Android/iOS JS bundles | Not completed؛ web dependencies ناقصة | `DEVICE_nabd_plus-web-export.out`, `DEVICE_NabdProvider-web-export.out` |`
- `36: فشلت محاولة `expo run:android --no-install` لكلا التطبيقين قبل Gradle بسبب الرسائل المثبتة: `Failed to resolve the Android SDK path` و`spawn adb ENOENT`. لم يوجد Android SDK أو emulator أو Gradle في sandbox. كما أن EAS cloud build أعاد `An `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: بناءً عليه، **لا يجوز اعتبار مرحلة اختبار الأجهزة مغلقة، ولا يجوز تسليم هذه الجولة كدليل جاهزية المتاجر**. الجاهزية المصدرية جيدة، أما جاهزية الأجهزة والمتجر فما زالت pending حتى توفير مسار بناء native ومزرعة أجهزة أو تنفيذها في بيئة خارجية`
- `36: فشلت محاولة `expo run:android --no-install` لكلا التطبيقين قبل Gradle بسبب الرسائل المثبتة: `Failed to resolve the Android SDK path` و`spawn adb ENOENT`. لم يوجد Android SDK أو emulator أو Gradle في sandbox. كما أن EAS cloud build أعاد `An `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
