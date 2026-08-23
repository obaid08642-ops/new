# Phase 5 — Diagnostics وHome-care وNursing

## الحالة

الحالة الحالية: **Partial / Blocked items موثقة**، وليست GO كاملة.

## ما أُغلق

تم إثبات Radiology live بالمعرف الحقيقي: قائمة الخدمات أعادت 200، وتفاصيل معرف حقيقي أعادت 200، ومعرف غير موجود أعاد 404. صفحة التفاصيل الموجودة في Web تستخدم `_id` كمعرف أساسي، ولا تعتمد على fallback غير حقيقي.

تم إثبات `GET /nursing/visits` حياً بـ401 دون جلسة، ثم أُضيف المسار إلى allowlist كـGET-only. أُضيف parser وserver wrapper يزيلان الحقول الخاصة ويستخدمان no-store وجلسة access server-side فقط.

بوابة Phase 5 الجزئية نجحت: 138 ملف اختبار، 277 اختباراً ناجحاً، 23 اختباراً متخطياً، وbuild إنتاجي ناجح.

## ما لم يُغلق

لا توجد في checkout الحالي واجهة Nursing visits كاملة أو proof owner/stranger/replay عبر Sandbox، ولا fixture حي يثبت تفاصيل Home-care/provider/tracking/visit report. لذلك لم تُنشأ بيانات بديلة ولم تُعلن الرحلة مكتملة. كما أن حجز الأشعة/الرعاية المنزلية يحتاج عقد mutation وDTO/fixture مثبتين قبل فتح زر شراء أو حجز.

## الأدلة

- `phase5-radiology-live-proof.log`
- `phase5-nursing-parser-validation.log`
- `phase5-nursing-allowlist-validation.log`
- `phase5-diagnostics-homecare-gate.log`

## قاعدة المتابعة

تظل العناصر غير المثبتة **Blocked pending contract/fixture**، وتُفتح فقط بعد probe حي للـmethod/path ثم اختبار owner=200، stranger=404، unauth=401، وreplay للم mutations عند انطباقها.
