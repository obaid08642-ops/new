# نتائج البناء الآلي واختبارات الحزم — 2026-08-17

## Patient

نجح `expo config --json` و`expo prebuild --no-install`. نجح `npm run export:web` في توليد web bundle وAndroid/iOS JavaScript bundles داخل `dist` المؤقت. هذا ليس APK أو IPA، ولا يثبت تشغيل native أو صلاحيات الجهاز.

فشل `expo run:android --no-install` قبل Gradle بسبب غياب Android SDK و`adb`. وفشل EAS cloud build غير التفاعلي لأن بيئة التنفيذ غير مسجلة في Expo/EAS.

## Provider

نجح `expo config --json` و`expo prebuild --no-install`. نجح typecheck و1 suite/3 tests. فشل web export لأن `react-dom` و`react-native-web` غير مثبتين، وهو ليس مسار Android المطلوب. فشل `expo run:android` بسبب غياب Android SDK و`adb`. وفشل EAS cloud build غير التفاعلي لغياب Expo account/token.

## حدود الدليل

لا يوجد APK/AAB/IPA ناتج من هذه الجولة. لا توجد screenshots أو crash reports من emulator/device farm لأن Android SDK وFirebase/GCP credentials غير متاحة. الأدلة الخام محفوظة بجانب هذه الوثيقة بأسماء `DEVICE_*`.
