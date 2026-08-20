# منصة نبض — Phase 17: موانع البنى الموقعة والأجهزة الفعلية

**التاريخ:** 2026-08-19
**الفرع:** `manus/on-live-reconciliation`
**الحكم:** **BLOCKED — لا توجد أدلة build موقّع أو جهاز/مزرعة أجهزة.** لا يثبت نجاح JavaScript tests أو Expo config صلاحية Android/iOS runtime.

## الجرد المصدرّي والبيئي

| العنصر | Provider | Patient | الحكم |
|---|---|---|---|
| Expo configuration | `app.json` موجود؛ Android package `com.nabd.plus.provider` وiOS bundle `com.nabd.plus.provider` | `app.json` موجود؛ Android package وiOS bundle `com.patient.nabd` | PASS إعداد فقط |
| EAS profiles | `eas.json` يحوي development/preview/production، ومر عبر JSON validation وProvider 30/30؛ SHA Provider archive `d81fbd14c1d9daedee18fd17679898b1f6ef06dd4c67810206fe14ee502b70e5` | `eas.json` يحوي development/preview/production، لكن production فارغ ولا يثبت credentials أو build سابق | PARTIAL إعداد فقط |
| مشروع native مولد | لا مجلدا `android/` أو`ios/` في worktree | لا مجلدا `android/` أو`ios/` في worktree | BLOCKED لعدم وجود artifact محلي أو build log |
| credentials موقعة | لا keystore أو p12 أو mobileprovision أو credential file ظاهر ضمن الجرد الاسمي | لا keystore أو p12 أو mobileprovision أو credential file ظاهر ضمن الجرد الاسمي | BLOCKED؛ لا يعني الجرد أن حساب EAS لا يملك credentials، بل لا يوجد دليل مفوض هنا |
| أدوات native في البيئة | لم توجد `eas` أو`expo` أو`adb` أو`xcodebuild` ضمن PATH | نفس النتيجة | BLOCKED؛ لا Android SDK/Xcode/device harness مثبت |
| APK/AAB/IPA/TestFlight | لا artifact أو checksum أو build URL أو signed-manifest متاح | لا artifact أو checksum أو build URL أو signed-manifest متاح | BLOCKED |
| device farm وهاتفان حقيقيان | لا logs/screenshots/videos أو ربط أجهزة | لا logs/screenshots/videos أو ربط أجهزة | BLOCKED |

## ما تم التحقق منه فقط

تتضمن إعدادات Provider صلاحيات الكاميرا والميكروفون والموقع والإشعارات والتحقق الحيوي، وتستخدم `https://api.nabd.plus/api/v1`. تتضمن إعدادات Patient deep links وassociated domains وFirebase config references ومجموعة أوسع من الصلاحيات، بما فيها camera/location/audio/notifications وbackground modes. وجود هذه التصريحات يزيد، ولا يقلل، الحاجة إلى اختبار موقّع على أجهزة حقيقية للـpermissions وdeep links وpush وbackground/CallKeep وGPS والكاميرا والباركود.

> أصبح للمشروعين `eas.json` بصيغة profiles متوازية وproduction فارغ. هذه تهيئة صالحة مبدئياً، لكنها ليست build receipt ولا تثبت وجود Apple signing أو Android keystore أو حسابات EAS مخولة. لم ينفذ هذا التغيير أي build أو submit أو نشر.

## متطلبات إزالة الحجب

| العمل المطلوب | مالك الاعتماد | دليل القبول |
|---|---|---|
| ربط EAS/Expo للمشروعين وتوفير project ownership | Owner/Release manager | build IDs قابلة للتحقق، profiles production وartifact URLs/SHAs |
| Android signing | Owner/Release manager | AAB/APK production signed، keystore محفوظ لدى المالك، Play integrity/installation log دون كشف secret |
| Apple signing/TestFlight | Apple Developer owner | certificate/provisioning managed، IPA/TestFlight build number وسجل نجاح الرفع |
| Android device farm | QA/Release | matrix Android صغيرة/متوسطة/tablet، Android versions، screenshots/logs/crashes |
| هاتفان فعليان | QA/Owner | Android وiOS: push/deep link/weak network/lifecycle/orientation/permissions/camera/GPS/audio/background test evidence |
| Native services | Product/Infra/Owner | LiveKit/CallKeep أو full-screen intent، Firebase/notifications، associated domains، privacy prompts وcrash reporting evidence |

## معيار خروج Phase 17

لا ينتقل الحكم إلى PASS إلا عند وجود artifacts موقعة لكل تطبيق وlogs/crashes/screenshots أو فيديو من device farm وهاتف Android وهاتف iOS، مع قائمة عيوب صريحة وإعادة تحقق للحالات الحرجة. غياب حسابات Apple/EAS أو الأجهزة ليس عيباً يمكن حله بإنشاء artifact غير موقع في هذا worktree.

## References

[1]: `NABDAH_AGENT_TRANSITION_OPEN_WORK_AND_REMAINING_PHASES_20260819.md` "Phase 17 ومعيار الخروج"
[2]: `../../nabdah_execution/provider/app.json` "تهيئة Provider Expo والصلاحيات"
[3]: `../../nabdah_execution/patient/app.json` "تهيئة Patient Expo وdeep links والصلاحيات"
[4]: `../../nabdah_execution/patient/eas.json` "profiles EAS الخاصة بـPatient"
[5]: `../../nabdah_execution/provider/eas.json` "profiles EAS الخاصة بـProvider"
