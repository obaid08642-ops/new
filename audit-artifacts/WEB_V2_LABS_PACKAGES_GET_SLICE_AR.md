# Contract Slice: Labs Packages + Package Detail GET

## الحكم

**الحالة: منفذة ومختبرة محلياً، جاهزة للدفع؛ ليست Sandbox-verified حتى الآن.** أُغلقت القراءة العامة للباقات عبر `GET /labs/packages` وتفاصيلها عبر `GET /labs/packages/{id}`، وهما مساران مثبتان في `LabsController` وخرائط العقود المحلية.

## النطاق المنفذ

أُضيفت صفحة القائمة `/[locale]/diagnostics/packages` وصفحة التفاصيل `/[locale]/diagnostics/packages/[packageId]`. القائمة تعرض الباقات التي يعيدها backend فقط، مع بحث وتصنيف مبنيين على البيانات الحية. التفاصيل تعرض الاسم والوصف والسعر السابق والحالي عند إعادتهما، عدد العناصر المشمولة، وقت النتيجة، متطلبات الصيام، تعليمات التحضير، وتوافر السحب المنزلي.

تم حذف أي اعتماد على `labs` أو `testsCount` غير المثبتين في schema. عدد التحاليل يُحسب فقط من `included_services` عندما يعيده backend كمصفوفة. لا توجد إضافة للسلة أو حجز أو دفع في هذه الشريحة؛ CTA mutation في شاشة Mobile مؤجل عمداً حتى عقد mutation موثق واختبارات idempotency.

## الأمان والصدق

يستخدم wrapper العام GET فقط ويمرر `Accept: application/json` دون Authorization أو token. يتم رفض `packageId` غير المطابق للـidentifier policy، ويحوّل upstream `404` إلى `notFound()` لمنع عرض مورد غير موجود. parser يحتفظ بالحقول العامة اللازمة فقط ويزيل حقول Mongo والحقول الداخلية أو الشخصية.

## الترجمة والتصميم

أضيفت مفاتيح `LabsPackages` إلى EN وAR وUR وHI وBN وFIL. الواجهتان RTL-compatible، responsive، وتحتويان على empty/error states صادقة. الحركة مقتصرة على transitions منخفضة التكلفة مع احترام `prefers-reduced-motion`.

## البوابات الفعلية

| البوابة | النتيجة |
|---|---|
| Labs parser | ناجح |
| Labs public wrapper | ناجح |
| Labs list SSR | ناجح |
| Packages list/detail SSR | ناجحان |
| Targeted total | 4 files / 7 tests ناجحة |
| Full Vitest | 121 files ناجحة، 14 متجاوزة؛ 225 tests ناجحة، 23 متجاوزة |
| Type-check | ناجح |
| Production build | ناجح؛ ظهر المساران `/[locale]/diagnostics/packages` و`/[locale]/diagnostics/packages/[packageId]` |
| Sandbox | غير مشغّل؛ متغيرات `NABD_SANDBOX_*` المعتمدة غير موجودة |

## المراجع المحلية

- `/home/ubuntu/nabdah_backend_work/src/modules/labs/labs.controller.ts`: تعريف مسارات packages وpackage detail.
- `/home/ubuntu/nabdah_backend_work/src/schemas/lab.schema.ts`: الحقول العامة لـ`LabService` و`included_services`.
- `/home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/packages.tsx`: تدفق القائمة في Mobile.
- `/home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/package-detail.tsx`: تدفق التفاصيل والعناصر التي تم فصلها عن mutation.
