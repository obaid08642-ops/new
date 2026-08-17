# تقرير جاهزية الأجهزة والتطبيقات — منصة نبض

**التاريخ:** 2026-08-17

## الحكم التنفيذي

أُغلقت في هذه الجولة بوابات المصدر والتهيئة والتصدير الآلي الممكنة داخل sandbox. نجح تطبيق المريض في typecheck و7 suites/23 tests وExpo web/JS export، ونجح تطبيق المزودين في typecheck و1 suite/3 tests وExpo prebuild. لم يُنتج APK أو AAB أو IPA، ولم تُنفذ اختبارات Android emulator أو Firebase Test Lab؛ السبب مثبت تقنياً: لا يوجد Android SDK أو `adb` أو Gradle في البيئة، وEAS غير مسجل الدخول، ولا توجد GCP/Firebase credentials أو macOS/Xcode/Apple Developer.

بناءً عليه، **لا يجوز اعتبار مرحلة اختبار الأجهزة مغلقة، ولا يجوز تسليم هذه الجولة كدليل جاهزية المتاجر**. الجاهزية المصدرية جيدة، أما جاهزية الأجهزة والمتجر فما زالت pending حتى توفير مسار بناء native ومزرعة أجهزة أو تنفيذها في بيئة خارجية معتمدة.

## مصفوفة النتائج

| المجال | Patient | Provider | الدليل |
|---|---|---|---|
| Expo config | Passed | Passed | `DEVICE_nabd_plus-expo-config.json`, `DEVICE_NabdProvider-expo-config.json` |
| Expo prebuild | Passed | Passed | `DEVICE_*prebuild.out` |
| TypeScript | Passed | Passed | سجل quality gates في جلسة التنفيذ |
| Unit/component tests | 7 suites / 23 tests | 1 suite / 3 tests | نتائج Jest المحفوظة في سجل التنفيذ |
| Web/JS export | Passed؛ web + Android/iOS JS bundles | Not completed؛ web dependencies ناقصة | `DEVICE_nabd_plus-web-export.out`, `DEVICE_NabdProvider-web-export.out` |
| APK/AAB | Not produced | Not produced | `DEVICE_*android-build.out` |
| IPA/TestFlight | Not produced | Not produced | Ubuntu لا يحتوي Xcode/macOS وEAS غير authenticated |
| Android emulator | Not run | Not run | Android SDK/adb غير متاحان |
| Firebase Test Lab | Not run | Not run | Firebase CLI/GCP credentials غير متاحة |
| Real-device tests | Deferred to owner | Deferred to owner | `REAL_DEVICE_CHECKLIST.md` |

## ما تحقق آلياً

تم التحقق من Expo configuration identifiers. يستخدم تطبيق المريض الحزمة `com.patient.nabd` على Android وiOS، ويستخدم تطبيق المزودين `com.nabd.provider`. نجح `expo prebuild` لكلا التطبيقين، ما يثبت أن الإعدادات قادرة على توليد native projects في المساحة المؤقتة، لكنه لا يثبت نجاح compilation أو التشغيل على جهاز.

نجحت بوابات جودة المصدر. واجتاز patient سبع مجموعات اختبار بإجمالي 23 اختباراً. واجتاز provider مجموعة واحدة بإجمالي ثلاثة اختبارات. احتاج تثبيت provider المؤقت إلى `--legacy-peer-deps` بسبب تعارض peer dependency بين LiveKit/React؛ لم تُعدّل lockfiles الحاكمة ولم يُرفع أي تغيير dependency.

نجح patient في `expo export` وأنتج web bundle وAndroid/iOS JavaScript bundles. هذا artifact ليس APK ولا IPA؛ لذلك لا يثبت صلاحيات الكاميرا أو الموقع أو الإشعارات أو CallKeep أو LiveKit native.

## ما لم يُنفذ ولماذا

فشلت محاولة `expo run:android --no-install` لكلا التطبيقين قبل Gradle بسبب الرسائل المثبتة: `Failed to resolve the Android SDK path` و`spawn adb ENOENT`. لم يوجد Android SDK أو emulator أو Gradle في sandbox. كما أن EAS cloud build أعاد `An Expo user account is required`، ولم يُستخدم login أو token من المالك.

لم تُشغّل Firebase Test Lab لأن Firebase CLI وgcloud غير متاحين ولم توجد بيانات اعتماد GCP أو مشروع billing معتمد. لم تُنتج screenshots أو crash reports من emulator/device farm؛ اختلاق هذه الأدلة غير مقبول.

لم يُنتج IPA أو TestFlight build لأن التنفيذ على Ubuntu لا يتضمن Xcode أو macOS، وEAS غير authenticated. هذا مانع بيئي موثق وليس فشل تطبيق.

## نطاق الاختبارات المؤجلة

تبقى المصفوفة التالية بحاجة إلى emulator أو device farm: ثلاثة مقاسات Android على الأقل، اللغات الست واتجاه RTL/LTR لكل شاشة، المسارات الطويلة للدواء والاستشارة والمختبر والأشعة والتمريض، 3G وانقطاع متقطع، mock location، orientation، lifecycle، permissions، crash/performance logs، وRobo/scripted tests على 5–10 أجهزة Android.

كما تبقى اختبارات الهاتفين الحقيقيين الخاصة بـpush والتطبيق المغلق، deep links، المكالمات الواردة، CallKeep/full-screen intent، LiveKit video الحقيقي، GPS أثناء الحركة، ومراجعة RTL والنصوص المقطوعة مؤجلة للمالك. خطواتها الكاملة موجودة في [`REAL_DEVICE_CHECKLIST.md`](REAL_DEVICE_CHECKLIST.md).

## العيوب أو الموانع المسجلة

| الرقم | النوع | الوصف | الحالة |
|---|---|---|---|
| DEVICE-BLOCKER-001 | بيئة | Android SDK وadb وGradle غير متاحة | مفتوح خارج الكود |
| DEVICE-BLOCKER-002 | اعتماد | EAS CLI غير authenticated ولا يوجد Expo token | مفتوح ويحتاج اعتماد المالك |
| DEVICE-BLOCKER-003 | اعتماد | Firebase Test Lab يحتاج GCP project/billing/credentials | مفتوح ويحتاج إعداد المالك |
| DEVICE-BLOCKER-004 | iOS | لا يوجد macOS/Xcode/Apple Developer أو EAS authenticated | مفتوح خارج sandbox |
| DEVICE-OBS-001 | dependency | Provider web export يحتاج `react-dom` و`react-native-web` إذا كان web export مطلوباً | غير مانع لمسار native؛ يحتاج قراراً قبل اختبار web |
| DEVICE-OBS-002 | config review | توجد مراجع API بديلة قديمة في provider؛ يجب تأكيد أن المستهلك الفعلي يستخدم `API_BASE=https://api.nabd.plus/api/v1` في كل مسار | يحتاج مراجعة مصدرية قبل الإطلاق |

## متطلبات الإغلاق التالية

لتنفيذ المرحلة المؤجلة، يجب توفير أحد مسارين. المسار الأول هو بيئة Android تحتوي SDK وplatform-tools وemulator images وGradle، مع EAS authenticated عند الحاجة. المسار الثاني هو Expo/EAS account صالح ومشروعان مرتبطان، مع حساب Firebase Test Lab/GCP مفعل ومصرح به. بالنسبة إلى iOS يلزم EAS authenticated أو جهاز macOS مع Xcode وحساب Apple Developer.

بعد توفير المسار، يجب بناء APKs موقعة للاختبار، رفعها إلى مزرعة الأجهزة، حفظ screenshots/videos/logs/crash reports، تنفيذ المصفوفة، ثم إعادة الاختبارات لأي عيب مصدرّي قبل commit/push. لا تُغلق العقود الأربعة الحساسة بهذه الاختبارات؛ تبقى fail-closed إلى اعتماد المالك القانوني والمنتجي.

## المراجع والملفات الداعمة

1. [`DEVICE_VALIDATION_INVENTORY_20260817.md`](DEVICE_VALIDATION_INVENTORY_20260817.md) — جرد البيئة والنتائج الأولية.
2. [`DEVICE_AUTOMATED_BUILD_RESULTS_20260817.md`](DEVICE_AUTOMATED_BUILD_RESULTS_20260817.md) — نتائج prebuild/export ومحاولات APK/EAS.
3. [`DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md`](DEVICE_SCREEN_ROUTE_INVENTORY_20260817.md) — جرد 249 route للمريض و42 شاشة للمزود.
4. [`REAL_DEVICE_CHECKLIST.md`](REAL_DEVICE_CHECKLIST.md) — خطوات الهاتفين الحقيقيين.
5. [`../todo.md`](../todo.md) — سجل البنود والقيود الحاكم.
