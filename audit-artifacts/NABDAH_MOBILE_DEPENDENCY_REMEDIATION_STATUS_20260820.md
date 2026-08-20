# منصة نبض — حالة معالجة اعتماديات تطبيقَي Patient وProvider

**التاريخ:** 2026-08-20
**الفرع:** `manus/on-live-reconciliation`
**الحالة:** **مُتحقق تقنياً؛ معالجة Expo/Metro الكاملة محجوبة بترقية SDK رسمية لاحقة، لا بإصلاح قسري.**

## التنفيذ الآمن

نفذ الأمر الرسمي `npx expo install --fix --npm` في كل من Patient وProvider بعد فحص `expo install --check --json`. أعادت الأداة في التطبيقين `Dependencies are up to date` ولم تغير `package.json` أو`package-lock.json`. لم يستخدم `npm audit fix` أو`--force` أو override خارج نطاق dependency المعلن.

| البوابة | Patient | Provider |
|---|---|---|
| Expo SDK compatibility check | PASS — up-to-date | PASS — up-to-date |
| `expo install --fix --npm` | PASS — لا تغيير | PASS — لا تغيير |
| typecheck | PASS | PASS (`tsc --noEmit`) |
| tests | PASS — 22 suites / 56 tests | PASS — 30 tests |
| web export | PASS — 91 ملفاً | PASS — 35 ملفاً |
| Expo Doctor | PARTIAL — callkeep/webrtc untested على New Architecture | PASS — 21/21 |

## تفسير الثغرات المتبقية

يشير `npm audit` إلى 18 finding في Patient و22 في Provider، ولا critical. السلسلة عالية الشدة هي Expo SDK 57 → Metro 0.84.4 → `image-size@1.2.1`. يصرح Metro بالإصدار `^1.0.2` من `image-size`، بينما advisory يشمل حتى 2.0.2؛ ولذلك لا يوجد إصدار مصحح يمكن تثبيته ضمن ذلك العقد. اقتراح audit الذي يخفض Expo إلى SDK 46 أو53 غير مقبول لأنه downgrade غير متوافق مع React Native 0.86 وSDK الحالي.

تظل الطريقة المدعومة هي انتظار أو اختيار release Expo SDK لاحق يحتوي Metro/image-size مصححين، ثم ترقيته incrementally وفق changelog، عبر `expo install` و`expo-doctor`، مع إعادة development builds وdevice matrix. لا يدّعي web export تغطية CallKeep/WebRTC أو runtime native.

## أثر Patient New Architecture

ينبه Expo Doctor إلى أن `react-native-callkeep` و`react-native-webrtc` غير مختبرين في React Native Directory على New Architecture. لم تحذف الحزمتان ولم تدرجا في exclude؛ يلزم اختبار Android/iOS موقّع فعلياً للمكالمات والصوت وbackground قبل القبول.

## References

[1]: [Expo SDK upgrade workflow](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
[2]: [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
[3]: `NABDAH_HARDENING_BASELINE_AND_SAFE_CHANGE_POLICY_20260820.md` "baseline الجرد"
[4]: `../../nabdah_execution/patient/package.json` "اعتماديات Patient"
[5]: `../../nabdah_execution/provider/package.json` "اعتماديات Provider"
