# منصة نبض — Phase 16: إصلاح P0 لتفويض زيارات التمريض

**الفرع:** `manus/on-live-reconciliation`  
**حالة المرشح قبل الإصلاح:** `3068a92ee421353379161210c255ce6e9ec7cab3` منشور ومفوض لاختبارات Sandbox.  
**الحكم:** **FIX source-level / REDEPLOY AND LIVE RETEST REQUIRED**.

## الدليل الحي المنقح

استخدم الاختبار حسابات Sandbox المعتمدة فقط. دخل Doctor Sandbox بنجاح، وأكد `GET /provider/auth/me` أن نوعه `doctor` وحالته `approved`. ثم أعاد `GET /nursing/visits` **HTTP 200** للطبيب، مع أن حساب Nursing المصرح به فقط هو الذي يجب أن يصل إلى قائمة زيارات التمريض. لا تتضمن هذه الوثيقة أسماء أو IDs أو رموز أو محتوى حجوزات.

## السبب المصدرى

كانت `NursingController.isNursingProvider` تقبل role العام `provider`. بما أن JWT جميع المزودين يحمل role=`provider` مع `provider_type` محدد، أصبح كل مزود معتمد، ومنه `doctor`، مؤهلاً لمسار التمريض قبل فحص ملكية الزيارة. هذا يعاكس قيد controller نفسه الذي يقصد role/nursing type صريحاً.

## المعالجة

تم حذف `provider` العام من قائمة roles المقبولة. تظل الأدوار الصريحة `nurse` و`nursing` و`home_care` و`hospital` وأنواع المزود المطابقة وحدها مقبولة. لا تغير المعالجة schemas أو بيانات أو migrations أو endpoint contracts.

| التحقق | النتيجة |
|---|---|
| اختبار سلبي جديد: `provider_type=doctor` على `getVisits` | PASS — `ForbiddenException` ولا يستدعى model query |
| اختبار NursingController المستهدف | PASS — 7 اختبارات |
| Backend build | PASS — `nest build` |
| حزمة Backend الكاملة | PASS — 67 suites / 378 tests |
| سلامة ZIP | PASS — `unzip -tq` |
| Backend SHA-256 المرشح الجديد | `01899dee30bf11dd0aab5cbea005241a4b8ef0e2d24a16caaf1dd7e2baad4f91` |

## أثر Phase 16

تجددت رموز Patient الأصلية عبر `POST /auth/refresh` بعد أن أثبتت claims أنها كانت منتهية، ثم نجح اختبار BOLA لمرجع Unified Booking مملوك: owner **200** وforeign patient **404**. هذا يثبت ذلك المورد والمسار فقط، وليس قبولاً عاماً لكل BOLA أو دورة حياة.

> لا يعد الإصلاح source-level دليلاً حيًا على البيئة المنشورة؛ تحمل البيئة الحالية المرشح السابق. يلزم تفويض مراجع منفصل لنشر مرشح Backend الجديد، ثم إعادة `GET /nursing/visits` بحساب Doctor (المتوقع **403**) وبحساب Nursing (المتوقع **200**) قبل متابعة Phase 16 أو إصدار أي حكم إطلاق.
