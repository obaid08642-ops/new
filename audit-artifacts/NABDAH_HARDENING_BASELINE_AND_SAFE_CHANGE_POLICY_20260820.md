# منصة نبض — baseline التحصين وسياسة التغيير الآمن

**التاريخ:** 2026-08-20
**الفرع الوحيد:** `manus/on-live-reconciliation`
**القاعدة:** لا `npm audit fix --force`، ولا downgrade تقترحه audit إن خالف Expo SDK، ولا index/migration إنتاجي أو نشر من هذه الدفعة من دون rollback واعتماد صريح.

## الاعتماديات وExpo/Metro

| الفحص | Patient | Provider | الحكم |
|---|---:|---:|---|
| `npm audit` | 18 finding: 8 high، 10 moderate | 22 finding: 14 high، 8 moderate | يلزم remediation؛ لا critical في الجولتين |
| `expo install --check --json` | up-to-date | up-to-date | توافق SDK 57 الحالي PASS |
| `expo-doctor` | 20/21؛ `react-native-callkeep` و`react-native-webrtc` untested على New Architecture | 21/21 PASS | Patient native-device risk يبقى مفتوحاً، لا يبرر حذف/ترقية libraries عشوائياً |
| Expo/React Native المقفلان | Expo 57.0.14 / RN 0.86.2 | Expo 57.0.14 / RN 0.86.2 | آخر patch في نطاق `^57.0.0` عند جرد npm هو 57.0.14 |

تقود الثغرات عالية الشدة إلى `expo → @expo/metro → metro@0.84.4 → image-size@1.2.1` في التطبيقين. يصرح Metro 0.84.4 بـ`image-size ^1.0.2`، بينما advisory يطاول الإصدارات حتى 2.0.2؛ لذلك لا يوجد override مصحح ضمن عقد Metro الحالي. كما أن `npm audit` يقترح downgrades إلى Expo 46 أو53 لبعض الشجرات، وهي ليست remediation متوافقة ولا تستخدم. ستتطلب إزالة هذا المسار ترقية SDK Expo مدروسة إلى release أحدث عندما تتوفر، incrementally ووفق changelog، وليس patch transitive غير مدعوم.

> التوثيق الرسمي يوصي بترقية Expo SDK تدريجياً، ثم `expo install --fix` و`expo-doctor`، وفحص changelog الخاص بكل SDK. [1] أما SDK 57 فيدعم React Native 0.86 ويثبت أن Expo 57.0.14 ضمن نسخته الحالية، لكن ذلك لا يجعل advisory في transitives مغلقاً. [2]

## API وOpenAPI

يوجد Swagger bootstrap خلف `SWAGGER_ENABLED` وبـBearer auth أساسي فقط، عند `/api/docs` في بيئات غير production أو عند التفعيل الصريح. لا يوجد حتى الآن catalog contract مكتمل موثق يعلن server URL، scopes، أخطاء response schemas، وcompatibility للمسارات التراثية. المسار الحديث الموثق لتأمين المريض هو `GET /insurance/active` خلف `JwtAuthGuard` و`NoGuestsGuard`; لا يوجد إثبات مصدرّي لمسار `/user/insurance` المعادل في الجرد الحالي. ستنشأ وثيقة OpenAPI نسخة مضبوطة واختبارات contract قبل إضافة alias أو deprecation.

## اللغات

تدعم التطبيقات **ست لغات فقط**: `ar`, `en`, `ur`, `hi`, `bn`, `fil`. في Patient يمثل ملف `tl.json` اللغة الفلبينية تحت runtime code `fil`; Provider يعلن المفاتيح نفسها. لا يوجد تعريف مصدرّي للغة سابعة في الجرد. لكن patient fallback قد يعرض المصدر العربي عند غياب ترجمة ثانوية؛ لذلك لا يجوز اعتبار data public eligible مكتملة لمجرد وجود `name_ar/name_en` قبل إضافة schema validation للـtranslations والـpublication workflow.

## فهارس Mongoose

المسح المصدرّي، لا قاعدة البيانات، كشف مرشحين اثنين للمراجعة: `LabResult.booking_id` يحمل property index مع `Schema.index` مفرد، و`mental-health.schema.ts` يعلن compound index مكرر لـ`patient_id, logged_at`. لا يحذف هذا baseline أي index. قبل تعديل source أو DB يلزم مراجعة query usage، جرد `getIndexes()` في بيئة Sandbox مخصصة، migration idempotent وrollback plan وفحص performance.

## بوابة الخروج من baseline

تنتقل الدفعة إلى التنفيذ فقط عندما يمر كل تغيير على build/typecheck/tests، يحفظ lockfile متسق، وتصبح كل remediation مدعومة ضمن SDK أو موثقة كمانع يحتاج upgrade رسمي. لا يعد نجاح tests دليل native signed ولا دليل production readiness.

## References

[1]: [Expo SDK upgrade workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
[2]: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
[3]: `../../nabdah_execution/patient/package.json` "اعتماديات Patient"
[4]: `../../nabdah_execution/provider/package.json` "اعتماديات Provider"
[5]: `../../nabdah_execution/backend/src/main.ts` "Swagger bootstrap"
[6]: `../../nabdah_execution/backend/src/modules/insurance/insurance.controller.ts` "عقد التأمين الحديث"
[7]: `../../nabdah_execution/backend/src/schemas/` "جرد schema indexes"
