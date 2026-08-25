# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE2_PARITY_MATRIX_REVIEW_AR.md`
- **Member SHA-256:** `32b600d710ed82f3fbf691e4dbae1412d77df54015d55615df033db721b447f0`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تم إنشاء مصفوفة parity قابلة لإعادة التشغيل تغطي **250 ملف شاشة/مسار Mobile**، وتربط كل ملف بمؤشرات التنقل والأفعال وHTTP methods وcandidate routes في Web. هذه المرحلة أُغلقت كمرحلة **Inventory/Mapping baseline**، لكنها لا تدعي أن كل شاشة أ`
- `11: | `partial-route-contract-review` | 14 | يوجد route مرشح ومؤشرات API/action، لكن يلزم مراجعة العقد والاختبارات قبل Done |`
- `12: | `partial-route-only` | 36 | يوجد route مرشح بالاسم أو alias، لكن وجود route لا يثبت action parity أو contract parity |`
- `13: | `missing-or-merged-route-review` | 200 | لا يوجد تطابق route مباشر؛ قد تكون الشاشة مدمجة في تدفق آخر أو مفقودة، وتحتاج قراراً وظيفياً |`
- `15: التصنيف أعلاه **محافظ ومتعمد**. تشابه اسم الملف لا يكفي لإغلاق الرحلة، كما أن route Web الواحد قد يجمع عدة شاشات Mobile. لذلك لن تُنقل أي خانة إلى `Done` إلا بعد مطابقة action-by-action واختبار العقد.`
- `19: تظهر أعلى كثافة فجوات غير محسومة في consultations subflows، diagnostics booking/results/tracking، family permissions/calendar/member-health، health medication/wearables، pharmacy returns/chat/broadcast/OCR، AI، emergency/SOS، wallet، matern`
- `23: تتحقق بوابة الخروج عندما توجد لكل رحلة وشاشة: route Web أو قرار دمج موثق، action list، endpoint/method حي أو contract evidence، ownership scope، loading/empty/error/not-found states، واختبارات قبول. المصفوفة الحالية تحقق inventory وmapping `
- `31: - `web_pages_files.txt``
- `32: - `web_api_routes_files.txt``
### backend_consumers_or_contracts
- `11: | `partial-route-contract-review` | 14 | يوجد route مرشح ومؤشرات API/action، لكن يلزم مراجعة العقد والاختبارات قبل Done |`
### auth_ownership
- `19: تظهر أعلى كثافة فجوات غير محسومة في consultations subflows، diagnostics booking/results/tracking، family permissions/calendar/member-health، health medication/wearables، pharmacy returns/chat/broadcast/OCR، AI، emergency/SOS، wallet، matern`
- `23: تتحقق بوابة الخروج عندما توجد لكل رحلة وشاشة: route Web أو قرار دمج موثق، action list، endpoint/method حي أو contract evidence، ownership scope، loading/empty/error/not-found states، واختبارات قبول. المصفوفة الحالية تحقق inventory وmapping `
### state_transitions
- `23: تتحقق بوابة الخروج عندما توجد لكل رحلة وشاشة: route Web أو قرار دمج موثق، action list، endpoint/method حي أو contract evidence، ownership scope، loading/empty/error/not-found states، واختبارات قبول. المصفوفة الحالية تحقق inventory وmapping `
### payment_insurance_relevance
- `19: تظهر أعلى كثافة فجوات غير محسومة في consultations subflows، diagnostics booking/results/tracking، family permissions/calendar/member-health، health medication/wearables، pharmacy returns/chat/broadcast/OCR، AI، emergency/SOS، wallet، matern`
### error_empty_loading_retry_cancel
- `23: تتحقق بوابة الخروج عندما توجد لكل رحلة وشاشة: route Web أو قرار دمج موثق، action list، endpoint/method حي أو contract evidence، ownership scope، loading/empty/error/not-found states، واختبارات قبول. المصفوفة الحالية تحقق inventory وmapping `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
