# Phase 2 — مراجعة مصفوفة parity بين Mobile وWeb

## الحكم المرحلي

تم إنشاء مصفوفة parity قابلة لإعادة التشغيل تغطي **250 ملف شاشة/مسار Mobile**، وتربط كل ملف بمؤشرات التنقل والأفعال وHTTP methods وcandidate routes في Web. هذه المرحلة أُغلقت كمرحلة **Inventory/Mapping baseline**، لكنها لا تدعي أن كل شاشة أصبحت منفذة؛ بل تجعل النقص قابلاً للتنفيذ والقياس.

## النتائج

| التصنيف المحافظ | العدد | المعنى |
|---|---:|---|
| `partial-route-contract-review` | 14 | يوجد route مرشح ومؤشرات API/action، لكن يلزم مراجعة العقد والاختبارات قبل Done |
| `partial-route-only` | 36 | يوجد route مرشح بالاسم أو alias، لكن وجود route لا يثبت action parity أو contract parity |
| `missing-or-merged-route-review` | 200 | لا يوجد تطابق route مباشر؛ قد تكون الشاشة مدمجة في تدفق آخر أو مفقودة، وتحتاج قراراً وظيفياً |

التصنيف أعلاه **محافظ ومتعمد**. تشابه اسم الملف لا يكفي لإغلاق الرحلة، كما أن route Web الواحد قد يجمع عدة شاشات Mobile. لذلك لن تُنقل أي خانة إلى `Done` إلا بعد مطابقة action-by-action واختبار العقد.

## المجالات التي تحتاج أكبر دفعة مطابقة

تظهر أعلى كثافة فجوات غير محسومة في consultations subflows، diagnostics booking/results/tracking، family permissions/calendar/member-health، health medication/wearables، pharmacy returns/chat/broadcast/OCR، AI، emergency/SOS، wallet، maternity، loyalty، delivery وvoice. هذه ليست كلها “مفقودة نهائياً”؛ بعضها يحتاج ربطاً مع route مدمج أو عقداً حياً غير موجود، ولذلك تظل حالتها `missing-or-merged-route-review` حتى تثبت.

## بوابة الخروج من Phase 2

تتحقق بوابة الخروج عندما توجد لكل رحلة وشاشة: route Web أو قرار دمج موثق، action list، endpoint/method حي أو contract evidence، ownership scope، loading/empty/error/not-found states، واختبارات قبول. المصفوفة الحالية تحقق inventory وmapping baseline، وتترك الإغلاق الوظيفي التفصيلي للمراحل التنفيذية التالية حتى لا تختلط “خريطة النقص” مع “إنجاز feature”.

## الأدلة والملفات

- `PHASE2_MOBILE_WEB_PARITY_MATRIX.tsv`
- `PHASE2_MATRIX_SUMMARY.json`
- `mobile_navigation_actions.tsv`
- `mobile_api_calls.tsv`
- `web_pages_files.txt`
- `web_api_routes_files.txt`
- `scripts/build_parity_matrix.py`

## القرار

**Phase 2 — Inventory/Mapping: PASS.**  
**Parity closure: NOT YET.** الفجوات البالغ عددها 200 تحتاج تنفيذاً أو توثيق دمج/حجب في Phases 3–6، ولا يجوز تسليمها كـ100% قبل إغلاقها بالأدلة.
