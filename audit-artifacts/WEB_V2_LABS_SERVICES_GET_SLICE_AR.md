# Contract Slice: Labs Services GET

## الحكم

**الحالة: منفذة محلياً، جاهزة للدفع بعد full gates، وليست Sandbox-verified.** أُغلقت القراءة العامة لخدمات المختبر عبر العقد الفعلي `GET /labs/services` الموجود في `LabsController.services`.

## العقد المثبت

المسار العام هو `GET /labs/services`، ويقبل فقط query parameters المثبتة في controller: `category`, `search`, `home_only`, `home_visit`, `highest_rated`, `nearest`, و`lowest_price`. لا تُرسل الصفحة أي Authorization أو session token لهذا المسار العام. التنفيذ يستخدم `home_visit=true` عند اختيار فلتر السحب المنزلي، ويستخدم البحث النصي مع URL encoding.

الـbackend يرشح الخدمات العامة النشطة والمسموح بعرضها طبياً، ويستبعد عناصر imaging من هذا الكتالوج. واجهة الويب تعرض خدمات القراءة فقط ولا تنشئ حجزاً أو تضيف عناصر إلى سلة.

## الحقول المسموح بها

يحتفظ parser بالحقول العامة اللازمة للعرض فقط: `id`, الأسماء والوصف بالعربية والإنجليزية، `short_code`, `category`, `sample_type`, `price`, `old_price`, متطلبات الصيام، التوافر المنزلي أو داخل المنشأة، زمن النتيجة، تعليمات التحضير، التوافر التأميني، الإحالة الطبية، وحالة عدم التوافر. تُزال أي حقول داخلية أو شخصية أو تشغيلية غير لازمة للعرض مثل patient/provider identifiers وMongo metadata.

## واجهة الويب

أُضيف المسار `/[locale]/diagnostics/labs` بست لغات. يتضمن بحثاً، فلتر home collection، حالات error وempty حقيقية، وبطاقات تعرض الاسم والوصف والسعر والـsample type والتوافر. التصميم responsive وRTL-compatible ويستخدم حركة hover محدودة مع احترام `prefers-reduced-motion`.

## الاختبارات والبوابات

| البوابة | النتيجة |
|---|---|
| Parser tests | 2 ناجحة |
| Server wrapper tests | 1 ناجحة |
| SSR tests | 2 ناجحة |
| Targeted total | 3 files / 5 tests ناجحة |
| Full Vitest | 120 files ناجحة، 14 متجاوزة؛ 223 tests ناجحة، 23 متجاوزة |
| Type-check | ناجح |
| Production build | ناجح؛ ظهر route `/[locale]/diagnostics/labs` |
| Sandbox contracts | غير قابلة للتشغيل حالياً؛ لا توجد متغيرات `NABD_SANDBOX_*` في البيئة |

## حدود الحقيقة

لم تُعتبر الشريحة live-verified في Sandbox، لأن الاعتمادات المعتمدة غير موجودة في البيئة الحالية. لا توجد mock data ولا نجاحات مصطنعة. يجب تشغيل `pnpm test:sandbox` فور وصول `NABD_SANDBOX_*` المعتمدة وتسجيل نتيجتها قبل إصدار حكم إنتاجي نهائي.

## المراجع المحلية

- `/home/ubuntu/nabdah_backend_work/src/modules/labs/labs.controller.ts`، تعريفات `GET /labs/services` وquery parameters.
- `/home/ubuntu/nabdah_backend_work/src/modules/labs/labs.service.ts`، filtering وpublic eligibility وprojection behavior.
- `docs/phase-3-patient-openapi-operation-map.md`، خريطة `LabsController_services_v1`.
