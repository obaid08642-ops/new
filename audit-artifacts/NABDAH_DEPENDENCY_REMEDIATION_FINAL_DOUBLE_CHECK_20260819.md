# المراجعة المزدوجة النهائية — معالجة التبعيات المصدرية

## نطاق المراجعة

أعيدت مراجعة أعمال التبعيات المنفذة بعد تقرير Phase 10 مقابل manifests وlockfiles والاختبارات والأرشيفات الحالية. لم تستخدم أي هجرة `--force` أو downgrade مقترحاً بشكل مكسّر، ولم يُنشر أي مكوّن. هذا حكم على المعالجة المصدرية فقط، وليس تصريح نشر أو قبول أجهزة.

| المكوّن | التغيير المنفذ | بوابة المصدر | تدقيق npm الحالي | الحكم |
|---|---|---|---|---|
| Backend | Nest 10→11 متسقة، SheetJS→ExcelJS، Google Vision وتحديث glob محدود | 67 suites / 373 tests، Nest build وتثبيت نظيف: **PASS** | 28 moderate، **0 high / 0 critical** | **PASS مصدرّياً** |
| تطبيق المريض | Expo SDK 54→57، إعداد/أنواع/اختبار/تصدير متوافق | TypeScript، 22 suites / 56 tests، Expo export: **PASS** | 10 moderate، 10 high، 0 critical | **PASS البوابات؛ خطر upstream باقٍ** |
| تطبيق المزودين | Expo SDK 54→57، Camera/Audio مدعومان، Router/config/native dedupe | `npm ci`، TypeScript، 1 suite / 19 tests، Android/iOS/Web export، Expo Doctor 21/21: **PASS** | 8 moderate، 16 high، 0 critical | **PASS البوابات؛ خطر upstream باقٍ** |
| لوحة الإدارة | Next 16.3.1 وتثبيت lockfile سابق | بوابة Next الموثقة: **PASS** | **0 findings** | **PASS** |

## قرار المخاطر المتبقية

النسخة المنشورة الأحدث لـExpo عند المراجعة هي 57.0.14. تفحص `npm audit fix` لتطبيقي المريض والمزودين يقترح downgrade غير مقبول إلى Expo 53.0.27/React Native 0.72.17 لمسارات عالية، لا ترقية آمنة ضمن خط SDK. لذلك لم يُطبق. يبقى كلا التطبيقيْن محجوبين عن حكم الإطلاق بسبب تلك المخاطر، حتى تصدر معالجة upstream متوافقة أو تنفذ هجرة SDK مستقبلية محكومة جديدة.

| قرار غير مسموح | سبب الرفض |
|---|---|
| `npm audit fix --force` | يمكن أن يغير API أو يعيد إصدار Expo/React Native بشكل مكسّر. |
| downgrade إلى Expo 53 أو React Native 0.72 | يعاكس الترقية الأمنية ويزيل توافق SDK 57 والمكونات التي اختبرت. |
| استبعاد تحذيرات Expo Doctor | سيخفي تكرار native أو مكتبة متقادمة بدلاً من علاجها؛ Provider صار 21/21 دون استثناء. |
| اعتبار export بديلاً عن جهاز فعلي | لا يثبت CallKeep/WebRTC/LiveKit/GPS/Push أو الخلفية أو Android/iOS signing. |

## نزاهة الأرشيفات الحالية

| الأرشيف | SHA-256 | الحالة |
|---|---|---|
| Backend | `82b8d667a147d8fe1b771e2c837940738d5e92e7906daf23ecad25cb1d96837e` | ZIP نظيف ومتحقق منه |
| تطبيق المريض | `c58ecfd1140c304b9ffe392b0fd72f638a21ce3993252e40283041f68e80c643` | ZIP نظيف ومتحقق منه |
| تطبيق المزودين | `6aaf4f74806eb4c79d95805fcd52a15a802abb3ea8885cc3b7701f54bcdfc711` | ZIP نظيف ومتحقق منه |
| لوحة الإدارة | `fafc08e48f9063dcb45775e86b3828e333d32cc46fbefaaae7472f8813f4cad2` | ZIP نظيف ومتحقق منه |

## النتيجة

اكتملت كل معالجة تبعيات قابلة للتنفيذ بأمان في المصدر، مع clean gates وأدلة وأرشيفات جديدة. لا تزال هجرات Expo المستقبلية، الاختبارات على الأجهزة، قبول deployment/BOLA، الدفع، العقود القانونية والجودة البشرية موانع مستقلة. يمكن الانتقال إلى تدقيق الجودة المصدرية، مع عدم حذف أي من هذه الموانع أو اعتبارها مغلقة.

## المراجع

[1]: NABDAH_BACKEND_DEPENDENCY_MIGRATION_20260819.md "هجرة Backend"
[2]: NABDAH_PATIENT_EXPO_SDK57_MIGRATION_20260819.md "هجرة تطبيق المريض"
[3]: NABDAH_PROVIDER_EXPO_SDK57_MIGRATION_20260819.md "هجرة تطبيق المزودين"
[4]: NABDAH_PHASE10_FINAL_DOUBLE_CHECK_20260819.md "تدقيق Phase 10"
