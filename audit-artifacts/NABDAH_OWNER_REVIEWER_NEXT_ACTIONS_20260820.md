# منصة نبض — حزمة المالك/المراجع لإغلاق موانع الجاهزية

**التاريخ:** 2026-08-20
**فرع Git الوحيد:** `manus/on-live-reconciliation`
**رأس Git الحالي:** `4f6bf3241e86632c7bb9f31d1c097e194f3cbdd5`
**الحكم الحالي:** **NO-GO** إلى أن تغلق البوابات التالية بدليل حي أو اعتماد مكتوب.

## 1. نشر المراجع وإعادة اختبار Sandbox

ينفذ Reviewer/DevOps فقط نشر Backend archive التالي بعد backup وrollback وreadiness/log plan:

| artifact | SHA-256 | ما يتضمنه |
|---|---|---|
| `nabdah-backend.zip` | `0862a289bf87b5525665dc6147ffdd6a1ecf9e984ce4917b98073790ab3d602b` | إصلاح Doctor identity للوصفة وإصلاح self-profile identity، إضافة إلى إصلاحات Phase 16 السابقة |

لا يتطلب هذا النشر أي migration أو تعديل database schema معروف، لكنه لا يعفي من backup/rollback الحتمي. بعد النشر، يثبت المراجع SHA المنشور ونجاح health/readiness، ثم يفوض إعادة اختبار API بحسابات Sandbox فقط.

| اختبار ما بعد النشر | النتيجة المطلوبة | cleanup |
|---|---|---|
| `GET /providers/me/profile` لحساب Doctor Sandbox | 200 وجسم ملف منقح غير فارغ | read-only |
| Actor بلا ملف/هوية غير مطابقة | 404 | read-only |
| clinic/cash → check-in → start → manual prescription | 201 ثم 200/200 ثم 201 وبند `PENDING_REVIEW` | تستكمل إلى terminal |
| send → pharmacy manual-review queue → substitute verified | 200 وظهور المرجع و200 | لا PHI أو IDs في الدليل |
| approve → dispense → archive → appointment complete | 200 لكل انتقال | الموارد terminal |
| foreign patient/doctor/pharmacy على الوصفة | 403 أو404 بحسب العقد | read-only negative |
| Lab embedded report | owner 200؛ foreign 404 | read-only |
| Hospital staff boundary | Hospital profile/fixture يقرأ وفق الصلاحية؛ Doctor 403 | read-only أو fixture مملوك |

## 2. البنى الموقعة وnative runtime

أضيفت تهيئة EAS محايدة إلى Provider؛ وهي **ليست** دليل توقيع. يحتاج مالك الإصدار توفير ملكية EAS/Expo للمشروعين، Android signing وApple Developer/TestFlight. لا ترسل keystores أو certificates أو كلمات مرور إلى المحادثة أو Git.

| المطلوب من المالك | الدليل الذي يقدمه المراجع |
|---|---|
| دعوة release account أو تشغيل build من حساب المالك | EAS build IDs وartifact URLs/SHAs |
| Android production signing | AAB/APK signed وinstallation log بلا secret |
| Apple signing وTestFlight | build number وسجل upload ناجح |
| Device farm وAndroid+iOS حقيقيان | screenshots/videos/logs/crashes للحالات الحرجة |

تختبر الأجهزة permissions وpush/deep links وweak network وbackground/lifecycle/orientation وcamera/GPS/audio وLiveKit/CallKeep أو full-screen intent، بالإضافة إلى crash reporting.

## 3. اللغات والإتاحة والـUX

التغطية التقنية للغات الست والـRTL اجتازت الاختبارات، لكن يلزم sign-off بشري. يراجع مختصون AR/EN/UR/HI/BN/FIL النص الطبي والمالي والقانوني، مع RTL للعربية فقط وLTR لبقية اللغات. توثق كل شاشة حرجة، truncation، font/rendering، screen reader، focus order، contrast، touch targets، light/dark mode، وتعيد الاختبارات بعد أي تعديل.

## 4. موانع لا يمكن للوكيل تجاوزها

| المانع | صاحب الاعتماد | الحد المطلوب |
|---|---|---|
| Moyasar | Owner/Finance/DevOps | test-safe activation ثم intent/webhook/idempotency/refund Sandbox |
| SOS/consent/location/AI/PHI | Owner/Legal/Product | اعتماد مكتوب للعقد والمحتوى والاحتفاظ والتدقيق |
| Admin RBAC | Owner/Admin reviewer | 2FA/step-up مفوض وfixtures معزولة وسجل تدقيق |
| Provider intake | Owner/QA | عناوين/هوية Sandbox معزولة ومسار cleanup pending/approved |
| Pharmacy/Lab/Radiology/Nursing/Hospital lifecycle | Owner/QA | fixtures مملوكة قابلة للتنظيف لكل actor/state |

## 5. ما يمكن أن يفعله الوكيل فور توفر كل اعتماد

بعد نشر SHA وتفويض Sandbox، يعيد الوكيل كل الاختبارات أعلاه، يكتشف ويصلح العيوب المصدرية القابلة للإثبات، ويحدث الأرشيفات والأدلة والـNO-GO/GO verdict. بعد توفير EAS/device access، يمكنه تشغيل profile builds المعتمدة وتحليل logs ونتائج device matrix؛ وبعد توفير مراجع اللغة، يدمج ملاحظات محددة فقط ويعيد البوابات.

## References

[1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Phase 16"
[2]: `NABDAH_PHASE16_PRESCRIPTION_DOCTOR_IDENTITY_P0_REMEDIATION_20260820.md` "إصلاح هوية الوصفة"
[3]: `NABDAH_PHASE16_PROVIDER_SELF_PROFILE_IDENTITY_REMEDIATION_20260820.md` "إصلاح ملف المزود"
[4]: `NABDAH_PHASE17_NATIVE_BUILD_AND_DEVICE_BLOCKERS_20260819.md` "Phase 17"
[5]: `NABDAH_PHASE18_LOCALE_ACCESSIBILITY_TECHNICAL_ACCEPTANCE_20260819.md` "Phase 18"
