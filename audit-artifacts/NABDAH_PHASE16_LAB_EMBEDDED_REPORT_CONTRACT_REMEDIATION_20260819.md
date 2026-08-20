# منصة نبض — Phase 16: إصلاح عقد قراءة التقرير المخبأ للمختبر

**التاريخ:** 2026-08-19
**الفرع:** `manus/on-live-reconciliation`
**الحكم:** **FIX في المصدر — إعادة الاختبار الحي مطلوبة بعد نشر مرشح مستقل.**

## الاكتشاف الحي المقيد

أعادت قائمة `GET /lab-results/mine` بحساب Patient Sandbox نتيجة واحدة من نوع تقرير مخبأ ضمن `labbookings.reports`. لم يعرض الاختبار محتوى التقرير أو الملف أو identifier. وعند استخدام reference نفسه مع `GET /lab-results/:id` أعاد المالك HTTP 404. لذلك كانت الواجهة قادرة على عرض عنصر للمريض لا يمكن فتحه.

لا يصح اعتبار HTTP 404 هنا دفاع BOLA ناجحاً، لأن المالك هو من تلقى الرفض. كما لم تنفذ أي عملية إنشاء نتيجة أو تغيير حالة أو قراءة للـbase64 ضمن هذا التحقيق.

## السبب المصدرّي

`LabResultsService.mineFor` يضم مصدرين في قائمة المريض:

| المصدر | آلية القراءة في القائمة |
|---|---|
| `LabResult` مستقل | استعلام `results.find({ patient_id })` |
| تقرير مخبأ في `labbookings.reports` | aggregate يعرض `reports.id` وmetadata |

لكن `LabResultsService.one` كان يبحث فقط في `LabResultRepository.findOne({ id })`. ولذلك لا يجد `reports.id` الذي تعرضه القائمة للمريض، حتى عندما يكون هذا المريض مالك `labbooking`.

## المعالجة وحماية الملكية

يبقى المسار الأساسي للنتيجة المستقلة كما هو، بما فيه إخفاء المورد الأجنبي. وإذا لم توجد نتيجة مستقلة، يستخدم المسار fallback واحداً فقط:

```ts
{ 'reports.id': id, patient_id: user.id }
```

للمستخدم غير الإداري، ثم يعيد metadata اللازمة للفتح: `id` و`booking_id` و`name` و`mime` و`url` و`notes` و`uploaded_at` و`state` و`source`. لا يعيد raw `base64` ولا يتخطى `patient_id`. الإدارة فقط تستخدم scope إداري قائم كما في العقد السابق.

| actor | التقرير المخبأ المملوك | التقرير الأجنبي |
|---|---|---|
| Patient owner | metadata قابلة للقراءة | — |
| Patient foreign | — | `NotFoundException` قبل عودة أي metadata |
| Admin | scope إداري قائم | حسب صلاحية الإدارة القائمة |

## أدلة المصدر والمرشح

| البوابة | النتيجة |
|---|---|
| `lab-results.service.spec.ts` | PASS — 5 اختبارات، منها فتح المالك ورفض المريض الأجنبي |
| Backend build | PASS — `nest build` |
| Backend regression الكامل | PASS — 67 suites / 389 tests |
| سلامة ZIP | PASS — استبعد `node_modules` و`dist` و`coverage` و`.env` |
| `nabdah-backend.zip` SHA-256 | `0010b9f7c52cc8e0b75c769ff327b8b343b5943c43b36e8d90fbb303164ce9a1` |

## إعادة الاختبار الحي المطلوبة بعد النشر

بعد نشر SHA المرشح بتفويض منفصل، يستخدم owner/foreign Sandbox لذات report reference:

1. يعيد owner HTTP 200 وmetadata فقط، من دون طباعة أو حفظ محتوى التقرير في دليل Git.
2. يعيد foreign HTTP 404 أو رفض الإخفاء المكافئ وفق العقد، ولا يعود أي metadata.
3. تعاد قائمة `GET /lab-results/mine` ثم detail، للتأكد أن كل عنصر مملوك معروض يبقى قابلاً للفتح.

> لا يثبت هذا الإصلاح دورة Lab كاملة أو توقيع تقرير. يغلق فقط عدم اتساق القائمة والتفاصيل وحدود الملكية الخاصة بالتقرير المخبأ.

## References

[1]: `NABDAH_PHASE16_SANDBOX_EXECUTION_REGISTER_20260819.md` "سجل Sandbox ومصفوفة Phase 16"
[2]: `../../nabdah_execution/backend/src/modules/labs/lab-results.service.ts` "مسارات قائمة وdetail نتيجة المختبر"
[3]: `../../nabdah_execution/backend/src/modules/labs/lab-results.service.spec.ts` "اختبارات owner وforeign للتقرير المخبأ"
