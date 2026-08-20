# منصة نبض — Phase 16: إصلاح هوية ملف المزود الذاتي

**التاريخ:** 2026-08-20
**الفرع الوحيد:** `manus/on-live-reconciliation`
**الحالة:** **FIX source / live retest required.**
**أرشيف Backend المرشح:** `nabdah-backend.zip`
**SHA-256:** `0862a289bf87b5525665dc6147ffdd6a1ecf9e984ce4917b98073790ab3d602b`

## الاكتشاف الحي

أعاد `GET /provider/auth/me` لحساب Doctor Sandbox HTTP 200. كما أثبتت مطابقة منقحة بين هوية الحساب وقائمة الأطباء العامة وجود ملف طبيب نشط مطابق، من دون تسجيل الاسم أو أي معرف. لكن `GET /providers/me/profile` أعاد HTTP 200 بجسم فارغ. هذا يترك تطبيق المزود بلا ملف خادمي موثوق وقد يدفع الواجهة إلى state غير محدد بدلاً من نجاح أو خطأ صريح.

## السبب المصدرّي والإصلاح

كان Controller يمرر `CurrentUser('id')` فقط، وكانت الخدمة تستعلم بـ`{ user_id }` حصراً. تستعمل حسابات provider مجموعة identifiers قد تشمل account/profile/provider IDs، ولا يضمن العقد أن `id` يساوي دائماً `ProviderProfile.user_id`.

يمرر Controller الآن actor الكامل. وتبني الخدمة مجموعة ضيقة من `id` و`account_id` و`provider_id` و`provider_profile_id`، ثم تبحث فقط ضمن `user_id` أو`id` أو`account_id` للملف. لا ينتج أي identifier عن request body ولا يقبل query عامة. عند غياب تطابق تعيد `NotFoundException` بدلاً من HTTP 200 فارغ.

## بوابات التحقق

| البوابة | النتيجة |
|---|---|
| `providers.service.spec.ts` | PASS — 3 tests |
| Regression | PASS — account/provider-profile owner يحصل على ملفه؛ foreign/no-identifier يعاد له NotFound |
| `npm run build` Backend | PASS |
| Backend full suite | PASS — 68 suites / 393 tests |
| ZIP integrity/exclusion | PASS — 927 ملفاً، بلا secrets أو node_modules أو dist |

## إعادة الاختبار الحي المطلوبة

بعد نشر مراجع صريح لهذا المرشح، يعاد `GET /providers/me/profile` لحساب Doctor Sandbox المتوقع أن يعيد HTTP 200 وجسم ملف غير فارغ منقح. يعاد كذلك طلب مزود غير مطابق أو actor بلا ملف للتأكد من HTTP 404، ويختبر تطبيق Provider شاشة الملف/الإعدادات على build موقّع قبل أي قبول UX.

## References

[1]: `../../nabdah_execution/backend/src/modules/providers/providers.controller.ts` "تمرير actor الكامل"
[2]: `../../nabdah_execution/backend/src/modules/providers/providers.service.ts` "استعلام الملف المملوك وfail-closed"
[3]: `../../nabdah_execution/backend/src/modules/providers/providers.service.spec.ts` "اختبارات owner وforeign"
[4]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Sandbox الحي"
