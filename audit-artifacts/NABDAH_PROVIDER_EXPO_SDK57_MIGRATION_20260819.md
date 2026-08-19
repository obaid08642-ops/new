# هجرة تبعيات تطبيق مزودي الخدمات — Expo SDK 57

## النطاق والحدود

نُفذت هذه الهجرة في نسخة عزل من أرشيف تطبيق مزودي الخدمات الحاكم وبشكل متدرج من **Expo SDK 54 إلى 55 ثم 56 ثم 57**. لم يُنشر أي تطبيق، ولم تُنشأ بيانات إنتاجية، ولم تُختبر المكالمات أو المسح أو الإشعارات على جهاز فعلي. الأرشيف لم يُستبدل إلا بعد بوابة تثبيت نظيف واختبارات وتصدير متعدد المنصات وExpo Doctor.

## الإصلاحات المصدرية وحل التبعيات

| المجال | المعالجة المنفذة | النتيجة |
|---|---|---|
| خط Expo/React Native | مواءمة تدريجية حتى `expo` 57.0.14 وReact Native 0.86.2 وReact 19.2.3، مع `@react-native/jest-preset` 0.86.2 و`jest-expo` 57.0.4. | شجرة SDK 57 قابلة للتثبيت نظيفاً بلا `--force` أو `--legacy-peer-deps`. |
| إعداد Expo | إزالة `newArchEnabled` غير الصالح و`android.usesCleartextTraffic` غير المقبول في schema، وإزالة plugins غير المهيأة. | Expo Doctor يمر 21/21. لا يضاف أي سماح cleartext صريح. |
| DateTimePicker | ثبتت ثلاثة مستهلكات فعلية في الطبيب والمختبر والأشعة؛ أُبقيت الحزمة التشغيلية المتوافقة ورفضت إزالة خاطئة أولية. أضيف إعداد تثبيت يستبعد peer Windows الاختياري غير المستهدف بدلاً من تجاوز peers. | TypeScript والتصدير على Android/iOS/Web يمرون. |
| مظهر النظام | قُيدت قيمة `ColorSchemeName` بالقيم `light` و`dark` قبل تحديث حالة السمة. | لا تدخل قيمة `unspecified` إلى حالة light/dark الصريحة. |
| StyleSheet/أيقونات | استبدلت واجهات `absoluteFillObject` المزالة بتخطيط صريح/مدعوم، وأضيفت `@expo/vector-icons` المطلوبة لشاشة التسجيل. | TypeScript يمر. |
| التنقل | كشف التصدير تعارض Expo Router مع React Navigation المستخدم فعلياً. لم يوجد أي مستهلك لـExpo Router، فأزيلت الحزمة والـplugin. | التصدير Web عاد بنجاح. |
| باركود المختبر والمنشأة | بقيت الشاشات تستخدم `CameraView` و`onBarcodeScanned` من `expo-camera`. أزيلت `expo-barcode-scanner` المتقادمة، وأضيف اختبار عقد يمنع عودتها. | أزيل تكرار `expo-image-loader` الناتج عن الحزمة المتقادمة. |
| تنبيهات الطبيب والصيدلية | نُقل التشغيل من `expo-av` غير المدعوم إلى `expo-audio`. احتُفظ بتكرار رنين الطبيب، والإيقاف، والتنظيف، وتحول تنبيه الصيدلية إلى player مدعوم. أضيف `expo-asset` peer المطلوبة واختبار عقد. | Expo Doctor يمر بالكامل. |
| Native duplicates | شُغّل `npm dedupe` ثم `npm ci` نظيف، وأصبح `expo-image-loader` 57.0.1 مرفوعاً في نسخة واحدة. | لا يكتشف Expo Doctor نسخ native مكررة. |

## بوابة التحقق النهائية

| بوابة | النتيجة |
|---|---|
| تثبيت نظيف من lockfile | **PASS — `npm ci`** |
| TypeScript | **PASS** |
| اختبار العقود | **PASS — 1 suite / 19 tests** |
| Expo export | **PASS — Android وiOS وWeb** |
| Expo Doctor | **PASS — 21/21 checks** |
| ZIP integrity | **PASS**؛ لا `node_modules` أو `dist` أو `coverage` أو `.expo` |
| تدقيق npm النهائي | 24 finding: 8 moderate، 16 high، 0 critical |

## نتيجة التدقيق المتبقية

انخفضت العيوب المصدرية والتكرارات وعيوب Expo Doctor إلى الصفر، لكن `npm audit` ما زال يعرض **16 high** على خط Expo/React Native 57 الحالي. تحققت النسخ المنشورة: Expo 57.0.14 هو الخط المتاح، بينما يقترح `npm audit fix` مساراً غير مقبول يرجع إلى Expo 53.0.27 أو React Native 0.72.17 في عدد من السلاسل. لم يُنفذ downgrade أو `--force`. هذه المخاطر موثقة كمخاطر upstream/toolchain متبقية وليست نتيجة يمكن حلها محلياً بشكل آمن بإجبار lockfile.

## حدود الاختبار الحي

نجاح التصدير ليس APK/IPA موقعاً ولا يثبت التشغيل على هاتف. يظل مطلوباً قبل الإطلاق: بناءات Android/iOS موقعة، اختبار فعلي لـLiveKit/WebRTC، الإشعارات، GPS، الخلفية، المسح بالكاميرا، تنبيه الصوت، RTL وإمكانية الوصول، وكذلك قبول Sandbox بعد نشر معتمد. لا يخفي هذا التقرير أي تحذير أجهزة أو خطر تدقيق متبقٍ.

## الأرشيف الناتج

```text
6aaf4f74806eb4c79d95805fcd52a15a802abb3ea8885cc3b7701f54bcdfc711
```

## مراجع

[1]: NABDAH_EXPO_MIGRATION_METHOD_20260819.md "منهج هجرة Expo"
[2]: NABDAH_READINESS_RESUMPTION_BLOCKER_RECONCILIATION_20260819.md "تصنيف موانع الاستئناف"
