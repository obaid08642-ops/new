# منصة نبض — Phase 16: إصلاح P0 لتفويض زيارات التمريض

**الفرع:** `manus/on-live-reconciliation`  
**حالة المرشح قبل الإصلاح:** `3068a92ee421353379161210c255ce6e9ec7cab3` كان منشوراً ومفوضاً لاختبارات Sandbox.
**مرشح الإصلاح المنشور:** `e7f3ceb0f50a121ee3726676ec27fc4d5ff09b43` على `manus/on-live-reconciliation`.
**الحكم:** **FIX source-level / LIVE BOUNDARY RETEST PASS**.

## الدليل الحي المنقح

استخدم اختبار الاكتشاف قبل الإصلاح حسابات Sandbox المعتمدة فقط. دخل Doctor Sandbox بنجاح، وأكد `GET /provider/auth/me` أن نوعه `doctor` وحالته `approved`. **قبل الإصلاح** أعاد `GET /nursing/visits` **HTTP 200** للطبيب، مع أن حساب Nursing المصرح به فقط هو الذي يجب أن يصل إلى قائمة زيارات التمريض. أما إعادة الاختبار بعد النشر فموثقة في جدول التحقق أدناه: Doctor **403** وNursing **200**. لا تتضمن هذه الوثيقة أسماء أو IDs أو رموز أو محتوى حجوزات.

## السبب المصدرى

كانت `NursingController.isNursingProvider` تقبل role العام `provider`. بما أن JWT جميع المزودين يحمل role=`provider` مع `provider_type` محدد، أصبح كل مزود معتمد، ومنه `doctor`، مؤهلاً لمسار التمريض قبل فحص ملكية الزيارة. هذا يعاكس قيد controller نفسه الذي يقصد role/nursing type صريحاً.

## المعالجة

تم حذف `provider` العام من قائمة roles المقبولة. تظل الأدوار الصريحة `nurse` و`nursing` و`home_care` و`hospital` وأنواع المزود المطابقة وحدها مقبولة. **هذه المعالجة المحددة لا تغير schemas أو بيانات أو migrations أو endpoint contracts لمسار التمريض.** وهي لا تنفي التغيير السابق والمقصود لعقد الوصفات: `PrescriptionsService.create` صار يتطلب `appointment_id` و`patient_id`، وموعداً `IN_PROGRESS` مملوكاً للطبيب، وأدوية من الكتالوج المعتمد؛ كما أزيل دور `ADMIN` من إنشاء الوصفات. مرشح الوصفات اللاحق يعيد تفعيل واجهة الطبيب فقط بعد تمرير هذه الحقول الخادمية صراحة، ويضيف الدواء اليدوي المقيد بالمراجعة؛ وهو مرشح مستقل غير دليل على هذا المورد التمريضي.

| التحقق | النتيجة |
|---|---|
| اختبار سلبي جديد: `provider_type=doctor` على `getVisits` | PASS — `ForbiddenException` ولا يستدعى model query |
| اختبار NursingController المستهدف | PASS — 7 اختبارات |
| Backend build | PASS — `nest build` |
| حزمة Backend الكاملة | PASS — 67 suites / 378 tests |
| سلامة ZIP | PASS — `unzip -tq` |
| Backend SHA-256 للمرشح المصدرّي عند الإصلاح | `01899dee30bf11dd0aab5cbea005241a4b8ef0e2d24a16caaf1dd7e2baad4f91` |
| تحقق Sandbox بعد النشر: Doctor | PASS — `GET /nursing/visits` أعاد **403** |
| تحقق Sandbox بعد النشر: Nursing | PASS — `GET /nursing/visits` أعاد **200** |

## أثر Phase 16

تجددت رموز Patient الأصلية عبر `POST /auth/refresh` بعد أن أثبتت claims أنها كانت منتهية، ثم نجح اختبار BOLA لمرجع Unified Booking مملوك: owner **200** وforeign patient **404**. هذا يثبت ذلك المورد والمسار فقط، وليس قبولاً عاماً لكل BOLA أو دورة حياة.

> أعيد النشر والتحقق الحي المصرح بهما لهذا المورد فقط: أعاد Doctor Sandbox **403** وأعاد Nursing Sandbox **200**. لذلك يعد P0 التمريض **مغلقاً حياً لهذا المسار**. لا يثبت ذلك بقية موارد BOLA أو دورات الحياة، ولا يجيز نشر مرشح الوصفات الأحدث أو إصدار حكم إطلاق.
