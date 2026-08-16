# سجل قبول المعالجة — Gatekeeper Remediation

**المشروع:** منصة نبض الصحية  
**الفرع الحاكم:** `manus/on-live-reconciliation`  
**النطاق:** backend NestJS/MongoDB ضمن `nabdah-backend.zip`  
**التاريخ:** 17 أغسطس 2026  
**إعداد:** Manus AI  
**أسلوب الأرشفة:** Editorial Governance Archive — دليل المصدر أولاً، ثم بوابة البناء، ثم قبول staging.

> هذا التقرير يصف ما عُدّل وما ثبت محلياً وما بقي مشروطاً ببيئة staging. نجاح البناء والاختبارات المحلية لا يساوي اعتماداً إنتاجياً أو موافقة نشر على المتاجر.

## 1. ملخص الحكم

نُفذت إصلاحات Gatekeeper الخمسة على نسخة المصدر الموجودة في فرع `manus/on-live-reconciliation`، ولم يُعدّل `main` أو الإنتاج. شملت المعالجة عيب BOLA الحرج في إلغاء الطلب، وتوحيد تفسير أدوار provider، وإزالة تعارض UUID/ObjectId في وحدة hospital، وتهيئة JWT_SECRET للاختبارات، وحصر فوالب localhost خارج production.

أثبتت البوابة المحلية نجاح TypeScript وNest build و**26 suite / 215 test**. ومع ذلك، لا يغلق هذا التقرير جولة E2E؛ إذ يجب إعادة التحقق على staging بالهويات الحقيقية المعزولة وبمصفوفة الملكية والأدوار قبل أي حكم جاهزية إنتاجية.

| البوابة | النتيجة | مستوى الإغلاق |
|---|---:|---|
| TypeScript check | ناجح بلا أخطاء | مصدر مغلق |
| Nest production build | ناجح | مصدر مغلق |
| Jest backend | 26 suite / 215 test ناجحة | مصدر مغلق |
| BOLA cancel | اختبارات رفض لهويتين غير مرتبطتين | يحتاج staging |
| provider/provider_type | اختبارات guard + إصلاحات الخدمات | يحتاج staging |
| Hospital UUID | فحص ثابت + build | يحتاج staging مع بيانات UUID |
| E2E staging بعد الإصلاح | لم يُعد تشغيله في هذه الدورة | مفتوح |

## 2. سجل الإصلاحات التفصيلي

### 2.1 P0 — حماية إلغاء الطلب من BOLA/IDOR

كان `OrdersService.cancel` يجلب الطلب بالمعرف ثم يمرر التنفيذ إلى سياسة الإلغاء والتدفق المالي دون التحقق من أن actor يملك الطلب أو الصيدلية المعيّنة له. أضيف تحقق مبكر قبل أي refund أو release أو stock restoration أو transition. يسمح العقد الآن بالمريض صاحب `patient_id`، أو الصيدلية المطابقة لـ`pharmacy_id`، أو `admin` و`super_admin` فقط. الدور العام `provider` لا يكفي وحده.

| الملف | التغيير | الأثر |
|---|---|---|
| `nabdah-backend/src/modules/orders/orders.service.ts` | مقارنة actor id مع patient/pharmacy وإطلاق `ForbiddenException` عند عدم التطابق | يمنع إلغاء طلب مريض من طبيب أو صيدلية أخرى |
| `nabdah-backend/src/modules/orders/orders.service.spec.ts` | حالات رفض لطبيب وصيدلية غير معيّنة | يثبت BOLA بين هويتين غير مالكتين |

### 2.2 P1 — توحيد provider role/provider_type

كانت بعض الرموز تصدر `role=provider` مع `provider_type` محدد، بينما الحارس وبعض الخدمات تقبل القيم المتخصصة فقط. أصبح JwtAuthGuard يبني أدواراً فعالة من `role` و`provider_type` من دون تغيير payload الأصلي أو منح صلاحيات عامة. كما أزيلت المقارنات الخام في LabsService وHomeCareSvc، ووُحّدت ملكية HospitalStaffService، وأضيفت أدوار تشغيلية صريحة لمسارات Radiology.

| المجال | الملفات | المعالجة |
|---|---|---|
| الحارس المركزي | `src/common/auth.guard.ts` | `role=provider, provider_type=lab` يطابق `UserRole.LAB`؛ النوع غير المطابق يُرفض |
| الاختبارات | `src/common/auth.guard.spec.ts` | قبول lab ورفض radiology عند provider_type=lab |
| المختبر | `src/modules/labs/labs.service.ts` | تطبيع داخلي لكل مسارات inbox/samples/report/transition |
| الرعاية المنزلية والتمريض | `src/modules/home-care/home-care.service.ts` | تطبيع check-in/report/care-plan/supplies واشتقاق doctor/nurse من النوع الفعلي |
| موظفو المستشفى | `src/modules/hospital-staff/hospital-staff.module.ts` | قبول provider_type=hospital فقط مع بقاء تحقق حساب المنشأة |
| الأشعة | `src/modules/radiology/radiology.controller.ts` | إضافة `Roles(radiology, hospital, admin)` للعمليات التشغيلية |

### 2.3 P1 — إصلاح UUID/ObjectId في HospitalService

كان `HospitalService` يحول `hospitalId` و`doctorId` إلى `Types.ObjectId` رغم أن هوية الحساب التجاري في User هي UUID محفوظة في الحقل `id`. صُححت عمليات branch/department/staff، وonboardDoctor، والتجميع، واستُبدل تحديث المستخدم عبر `_id` بتحديث `{ id: doctorId }`. بقي تحويل `appointmentId` إلى ObjectId لأنه معرف Mongo الداخلي لمسار الموعد، وليس معرف الحساب التجاري.

| الملف | التغيير |
|---|---|
| `src/modules/hospital/services/hospital.service.ts` | إزالة تحويلات `hospitalId/doctorId`، واستخدام string/UUID، وتحديث User عبر `id` |
| `src/modules/hospital/schemas/hospital-branch.schema.ts` | `hospital_id` أصبح string |
| `src/modules/hospital/schemas/hospital-department.schema.ts` | `hospital_id` و`branch_id` أصبحا string |
| `src/modules/hospital/schemas/hospital-staff.schema.ts` | user/hospital/branch/department ids أصبحت string |
| `src/modules/care/schemas/doctor-profile-extended.schema.ts` | doctor/parent/affiliated hospital ids أصبحت string |

### 2.4 P2 — تهيئة Jest

أضيف `src/jest.setup.ts` ليضبط `NODE_ENV=test` و`JWT_SECRET` الاختباري عند غيابه، وسُجل الملف في `package.json` تحت `setupFiles`. لا يحتوي الملف على أسرار إنتاجية، ولا يُستخدم كبديل لإدارة أسرار النشر.

### 2.5 P2 — حصر localhost

في `src/app.module.ts` و`src/modules/redis/redis.service.ts` أصبحت قيم localhost متاحة فقط عندما لا تكون البيئة production. إذا غاب `MONGO_URL` أو `REDIS_URL/REDIS_HOST` في production يفشل التطبيق برسالة صريحة بدلاً من الاتصال بخدمة محلية خاطئة.

## 3. فهرس الملفات المعدلة

| الملف | التصنيف |
|---|---|
| `src/modules/orders/orders.service.ts` | P0 authorization |
| `src/modules/orders/orders.service.spec.ts` | BOLA regression tests |
| `src/common/auth.guard.ts` | provider role normalization |
| `src/common/auth.guard.spec.ts` | role contract tests |
| `src/modules/labs/labs.service.ts` | provider_type internal gates |
| `src/modules/home-care/home-care.service.ts` | nursing/home-care internal gates |
| `src/modules/hospital-staff/hospital-staff.module.ts` | hospital owner role contract |
| `src/modules/radiology/radiology.controller.ts` | radiology provider route roles |
| `src/modules/hospital/services/hospital.service.ts` | UUID-safe hospital operations |
| `src/modules/hospital/schemas/hospital-branch.schema.ts` | UUID schema alignment |
| `src/modules/hospital/schemas/hospital-department.schema.ts` | UUID schema alignment |
| `src/modules/hospital/schemas/hospital-staff.schema.ts` | UUID schema alignment |
| `src/modules/care/schemas/doctor-profile-extended.schema.ts` | UUID schema alignment |
| `src/app.module.ts` | production-safe configuration |
| `src/modules/redis/redis.service.ts` | production-safe Redis configuration |
| `src/jest.setup.ts` | test environment |
| `package.json` | Jest setup registration |

## 4. أدلة الاختبار والبناء

تم تشغيل الأوامر على نسخة العمل المعزولة من حزمة backend بعد إعادة استخدام اعتماديات محلية سليمة؛ لم تُعدّل lockfiles بسبب تعارض peer تاريخي بين Nest Terminus 11 وMongoose 10 في محاولة `npm ci`. نجح TypeScript دون مخرجات خطأ، ونجح `nest build`، ثم نجحت المجموعة الكاملة كما يلي:

```text
Test Suites: 26 passed, 26 total
Tests:       215 passed, 215 total
Snapshots:   0 total
```

كما أُجري فحص ثابت للتأكد من عدم بقاء التحويلات المستهدفة `new Types.ObjectId(hospitalId)` أو `new Types.ObjectId(doctorId)` أو بوابة Labs القديمة القائمة على `user.role` فقط. بقيت سلاسل localhost في المصدر، لكنها ظهرت داخل شروط non-production المقصودة فقط.

## 5. ما لم يُنفذ بعد

لا تزال إعادة تشغيل مصفوفة E2E على staging مفتوحة. يجب تنفيذ حسابين على الأقل في مسار إلغاء الطلب: patient owner ينجح وفق السياسة، وidentity غير مرتبطة تفشل بـ403 دون أي refund أو transition. كما يجب اختبار provider token بصيغة `role=provider` مع `provider_type` لكل من lab وradiology وnursing/home_care وhospital، ثم اختبار `GET /hospital/staff` و`onboardDoctor` بمعرفات UUID فعلية.

تبقى كذلك موانع تشغيلية لا يحلها تعديل TypeScript وحده: تدوير اعتماد R2 المكشوف تاريخياً، إعادة بناء صورة FastAPI التي قد تحمل seed القديم، واعتماد العقود النهائية لـconsent وQR وlocation وerror-codes. هذه البنود موثقة كموانع منفصلة ولا يجوز تحويلها إلى حكم نجاح محلي.

| المانع | الإجراء التالي | شرط الإغلاق |
|---|---|---|
| staging E2E | تشغيل خطة الأدوار والملكية على `http://57.131.133.208:8003/api/v1` | نتائج موثقة لكل حالة نجاح/رفض |
| R2 credential | تدوير السر من secret manager وفحص Git history | تحقق عدم صلاحية القديم |
| FastAPI seed image | إعادة بناء الصورة وإعادة نشرها في بيئة غير إنتاجية | تحقق أن seed القديم غير موجود |
| consent/QR/location/error codes | اعتماد API contract وDTO والـownership والاختبارات | قبول backend + consumer + staging |

## 6. حكم الجاهزية

الحكم الحالي هو **SOURCE REMEDIATED / BUILD AND LOCAL TESTS PASS / STAGING REVALIDATION REQUIRED**. لا يثبت هذا التقرير أن المنصة جاهزة للإنتاج أو المتاجر؛ يثبت أن عيوب Gatekeeper المحددة عولجت في المصدر وأن backend يترجم ويجتاز الاختبارات المحلية. يبقى قرار الدمج أو النشر مشروطاً بنتائج staging، ومراجعة الأسرار، وإغلاق عقود FastAPI وconsent/QR/location/error-codes.

## References

[1]: NABDAH_LIVE_RECONCILIATION_REGISTER_20260815.md "سجل المصالحة الحاكم"

[2]: POST_REMEDIATION_E2E_EXECUTION_PLAN.md "خطة E2E بعد المعالجة"

[3]: EXECUTION_COMPLETION_MATRIX_20260816.md "مصفوفة الإكمال والتنفيذ"
