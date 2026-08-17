# سجل جرد اختبار الأجهزة — منصة نبض

**التاريخ:** 2026-08-17

## نطاق الجرد

تم فحص checkout الحاكم `manus/on-live-reconciliation` والأرشيفين `nabd_plus_patient_app.zip` و`NabdProvider-provider.zip` دون تعديل ملفات المصدر أو أسرار البيئة. كلا التطبيقين مبنيان على Expo SDK 54 وReact Native 0.81، ويحتويان على إعدادات Android وiOS native داخل الأرشيف.

## نتائج الأدوات

| الأداة أو البيئة | النتيجة | الأثر |
|---|---|---|
| Node/npm/Java | متاحة | تسمح بفحص TypeScript والاختبارات وتثبيت dependencies مؤقتاً |
| Android SDK / `adb` / `emulator` / `sdkmanager` / Gradle | غير متاحة في sandbox | لا يمكن تشغيل Android emulator أو إنتاج APK محلياً بهذه البيئة قبل توفير SDK/Gradle أو EAS cloud |
| EAS CLI | غير متاحة كأداة مثبتة | لا يوجد مسار EAS authenticated جاهز؛ يلزم حساب Expo/EAS ومشروع صالح قبل cloud build |
| Firebase CLI / gcloud | غير متاحة كأدوات مثبتة | لا يمكن بدء Firebase Test Lab دون GCP project، billing، credentials، وتهيئة CLI |
| Xcode/macOS/Apple Developer | غير متاحة في Ubuntu sandbox | لا يمكن إنتاج IPA أو تشغيل iOS Simulator؛ يلزم EAS cloud authenticated أو Mac/Apple Developer |

## API production configuration

تم العثور على endpoint إنتاج صحيح في إعدادات patient/provider: `https://api.nabd.plus/api/v1`. توجد في provider بعض مراجع API قديمة/بديلة ضمن كود الإعداد، ولذلك لا يُغلق بند build-to-production قبل مراجعة أن المستهلك الفعلي يستخدم `API_BASE` الإنتاجي الصحيح في كل مسار.

## جودة المصدر

| التطبيق | TypeScript | Tests | ملاحظة تثبيت |
|---|---:|---:|---|
| Patient | ناجح | 7 suites / 23 tests ناجحة | `npm ci` رفض lockfile غير متزامن؛ أُجري التحقق بعد `npm install` مؤقتاً خارج Git |
| Provider | ناجح | 1 suite / 3 tests ناجحة | `npm install` احتاج `--legacy-peer-deps` بسبب تعارض peer dependency بين LiveKit/React؛ لم يُعدّل lockfile الحاكم |

## حكم المرحلة

أُغلقت بوابة quality gates المصدرية المؤقتة للتطبيقين. لم تُغلق مرحلة بناء APK أو اختبار emulator/device farm؛ سبب ذلك نقص Android SDK/Gradle/EAS/Firebase credentials في بيئة التنفيذ، وليس فشلاً صامتاً أو نتيجة مخمّنة. سيُوثق أي APK أو تقرير مزرعة فقط بعد الحصول على artifact ودليل قابل لإعادة التحقق.

## محاولات بناء native

نجح `expo config --json` و`expo prebuild --no-install` للتطبيقين في مساحة مؤقتة، مع توليد native directories. لكن `expo run:android --no-install` فشل للتطبيقين قبل Gradle لأن Android SDK غير موجود و`adb` غير متاح (`Failed to resolve the Android SDK path`, `spawn adb ENOENT`). لم ينتج أي APK أو AAB.

تم اختبار مسار EAS cloud build غير التفاعلي للتطبيقين، وأعاد CLI: `An Expo user account is required ... eas login or EXPO_TOKEN`. لم يتم تسجيل الدخول أو إرسال token أو بدء build سحابي. لذلك بناء APK قابل للتنزيل ينتظر اعتماد Expo/EAS من المالك أو توفير Android SDK/Gradle في بيئة تنفيذ مخصصة.

نجح prebuild الخاص بـiOS في توليد/إعادة استخدام native project داخل المساحة المؤقتة، لكن إنتاج IPA وTestFlight يتطلب EAS authenticated أو macOS/Xcode وحساب Apple Developer. لم يُنتج IPA في هذه الجولة.
