# منصة نبض — Phase 16: إصلاح تطبيع دور Hospital Provider

**التاريخ:** 2026-08-19
**الفرع:** `manus/on-live-reconciliation`
**الحكم:** **FIX في المصدر — يتطلب أرشيفاً وcommit ثم تفويض نشر منفصل وإعادة اختبار حي.** لا يعد هذا المستند دليلاً أن البيئة المنشورة تحمل الإصلاح.

## الاكتشاف الحي المنضبط

بعد تسجيل دخول حساب Hospital Sandbox المعتمد بنجاح، أعاد `GET /provider/auth/me` HTTP 200، ما أثبت صلاحية جلسة الحساب. ومع ذلك، أعاد `GET /hospital/staff` HTTP 403. لم تنفذ أي عملية إنشاء أو تعديل أو حذف، ولم يسجل هذا الدليل أي identifier أو محتوى staff أو PII.

| العملية | actor | النتيجة الحية | الاستنتاج المحدود |
|---|---|---|---|
| `GET /provider/auth/me` | Hospital Sandbox | HTTP 200 | الحساب والجلسة صالحان |
| `GET /hospital/staff` | Hospital Sandbox | HTTP 403 | لا يمكن اعتبار دورة hospital/staff قابلة للقبول بهذا المورد المنشور |
| `GET /hospital/staff` | Doctor/Patient | لم ينفذ في هذه الجولة | يجب أن يستمر مرفوضاً بعد الإصلاح المصدرّي |

## السبب المصدرّي

كانت `HospitalService.assertFacilityActor` تستخرج الدور بهذه الأولوية: `actor.role || actor.provider_type`. حسابات Provider تستخدم `role: provider` مع `provider_type: hospital`؛ لأن `role` غير فارغ لم تكن خدمة المستشفى تصل إلى نوع المزود. والنتيجة هي رفض Hospital Provider الصحيح كما لو كان دوراً عاماً غير مخول.

هذا عيب تطبيع هوية/دور، وليس دليلاً على خلل بيانات موظفين أو حاجة إلى bypass. لا يعالج بقبول role العام `provider`، لأن ذلك سيوسع نطاق المستشفى إلى مزودين غير منشآت.

## المعالجة

استبدل الإصلاح استخراج الدور الخام بـ`getEffectiveRoles(actor)`، ثم يختبر قائمة صريحة:

| عملية المنشأة | الأدوار الفعالة المسموح بها |
|---|---|
| القراءة | `hospital` أو `hospital_admin` أو `branch_admin` أو `receptionist` أو `finance` أو `admin` أو `super_admin` |
| الكتابة | `hospital` أو `hospital_admin` أو `branch_admin` أو `admin` أو `super_admin` |

لذلك يقبل actor من الشكل `{ role: "provider", provider_type: "hospital" }` ويستمر رفض `{ role: "provider", provider_type: "doctor" }` و`patient` قبل أي query. لا تغير المعالجة schema أو migration أو contract path، ولا تنشئ staff fixture.

## أدلة المصدر

| البوابة | النتيجة |
|---|---|
| `HospitalService` المستهدف | PASS — 4 اختبارات، تشمل قبول Hospital Provider ورفض Doctor Provider/Patient قبل query |
| Backend build | PASS — `nest build` |
| Backend regression الكامل | PASS — 67 suites / 386 tests |

## أرشيف المرشح الجديد

أعيد بناء `nabdah-backend.zip` من worktree الذي اجتاز بوابة الاختبارات الكاملة. تحققت سلامة ZIP واستبعاد `node_modules` و`dist` و`coverage` وملفات `.env` والبناءات المحلية.

| الأرشيف | SHA-256 | الحالة |
|---|---|---|
| `nabdah-backend.zip` | `6b6d119b5e6c7deeb0d4ea4f897d54c5fd9728200f74bc4f76487d784367d528` | PASS — مصدر Hospital RBAC ووصفات Phase 16 موجودان في المرشح غير المنشور |

## التحقق الحي التالي

بعد نشر SHA المرشح بتفويض Reviewer/DevOps مستقل، يعاد الاختبار بحسابات Sandbox فقط:

1. يعيد Hospital Sandbox `GET /hospital/staff` إلى HTTP 200، حتى إن كانت القائمة فارغة.
2. يعيد Doctor Sandbox وPatient Sandbox HTTP 403 أو 404 حسب عقد الإخفاء، ولا يستدعيان قائمة staff.
3. لا تنفذ أي عملية كتابة staff إلا على fixture Hospital مملوك وموسوم للتنظيف ومع دليل before/after.

> لا تغلق Phase 16 Hospital lifecycle بهذا الإصلاح. فهو يعالج حدود الوصول الأولية فقط؛ تبقى staff/branch/bed/appointment transitions والمراجعة الحية مطلوبة.

## References

[1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل النتيجة الحية ومصفوفة Phase 16"
[2]: `../../nabdah_execution/backend/src/modules/hospital/services/hospital.service.ts` "تطبيع الدور والتحقق من actor"
[3]: `../../nabdah_execution/backend/src/modules/hospital/services/hospital.service.spec.ts` "اختبارات قبول Hospital Provider ورفض الأدوار الأجنبية"
