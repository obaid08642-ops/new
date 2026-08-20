# هجرة تبعيات تطبيق المريض — Expo SDK 57

## النطاق والقرار

نُفذت الهجرة في نسخة معزولة من أرشيف تطبيق المريض الحاكم وبخطوات SDK متتابعة: **54 → 55 → 56 → 57**. لم يُنفذ أي نشر، ولم تُنشأ أو تُعدل بيانات إنتاجية، ولم تُختبر المكالمات أو الموقع أو الإشعارات على جهاز فعلي ضمن هذه الهجرة.

## المعالجة المصدرية

| بند | المعالجة المثبتة |
|---|---|
| مواءمة Expo | ترقية الحزم تدريجياً حتى `expo` 57.0.14 وReact Native 0.86.2 عبر مواءمة Expo، لا عبر force أو تثبيت عشوائي. |
| تعارض SDK | إزالة `expo.sdkVersion` القديم من `app.json`؛ كان يثبت أدوات Expo على SDK 54 رغم الحزمة الهدف. |
| إعداد التطبيق | إزالة `newArchEnabled` غير المقبول في schema ونقل إعداد splash إلى `expo-splash-screen` plugin مع الصورة واللون ونمط العرض الأصليين. |
| الروابط العميقة | إزالة اعتماد `@react-navigation/native` المباشر الذي لم يكن له مستهلك؛ استبدل نوعه المحلي بعقد بنيوي يحافظ على كل خرائط المسارات المصدرة. |
| توافق TypeScript | إضافة أنواع Node/Jest الصريحة، إصلاح مراجع `StyleSheet.absoluteFillObject` المزالة، وإضافة تبعية التنقل الناقصة ثم إزالتها بعد تحويل عقد الروابط. |
| توافق Jest | إضافة preset اختبارات React Native، ثم تثبيته عند إصدار 0.85.3 المتوافق مع خطوة SDK 56 قبل الانتقال إلى 57. |
| Expo config | إزالة `expo-modules-core` و`@expo/config-plugins` كاعتمادات مباشرة غير لازمة، إزالة plugin DateTimePicker غير المهيأ، وإضافة peer `expo-asset` المطلوبة. |

## بوابات التحقق

| بوابة | النتيجة |
|---|---|
| تثبيت نظيف من lockfile | **PASS** |
| TypeScript | **PASS** |
| Jest | **PASS — 22 suite / 56 test** |
| Expo production web export | **PASS**؛ تضمّن حزم web وAndroid وiOS من التصدير |
| Expo Doctor | **20/21 PASS**؛ التحذير الوحيد هو عدم اختبار `react-native-callkeep` و`react-native-webrtc` في React Native Directory على New Architecture. لم يُخف هذا التحذير عبر exclude. |
| `npm audit` قبل الهجرة | 30 finding: 13 moderate، 17 high، 0 critical |
| `npm audit` بعد المواءمة وتحديثات lockfile غير القسرية | 20 finding: 10 moderate، 10 high، 0 critical |
| الأرشيف | **PASS**؛ لا يتضمن `node_modules` أو `dist` أو `coverage` أو `.expo` |

التدقيق المتبقي يأتي من مسارات Expo/React Native وأدوات البناء الحالية. اقترح `npm audit --force` رجوعاً مكسراً إلى Expo 46 لبعض المسارات، ولذلك رُفض؛ لم يُستخدم force. ما زالت هذه findings موانع إصلاح upstream/SDK تحتاج متابعة مدروسة وليست تصريحاً لتخفيض SDK أو خلط خط متوافق.

## المانع المتبقي

لا تزال مكتبتا `react-native-callkeep` و`react-native-webrtc` غير مختبرتين في React Native Directory على New Architecture. لا يعد ذلك فشلاً في TypeScript أو Jest أو التصدير، لكنه يمنع اعتبار المكالمات وخلفية الاتصال جاهزة على الأجهزة. يبقى الاختبار على هاتفين حقيقيين وبناء Android/iOS موقع شرطاً مستقلاً، ولا يجوز إخفاء التحذير أو الادعاء بأنه اجتاز.

## الأرشيف الناتج

```text
c58ecfd1140c304b9ffe392b0fd72f638a21ce3993252e40283041f68e80c643
```

## مراجع

[1]: NABDAH_EXPO_MIGRATION_METHOD_20260819.md "منهج الهجرة التدريجية المعتمد"
[2]: NABDAH_READINESS_RESUMPTION_BLOCKER_RECONCILIATION_20260819.md "تصنيف موانع الاستئناف"
