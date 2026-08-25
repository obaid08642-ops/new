# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/security-gate-index-2026-08-20.md`
- **Member SHA-256:** `9eec229cdc1e9bf7ee036f62f7467c405f19f893a01047ef7604dd308e5d6b2d`
- **Line count:** 39
- **Read range:** `1-39`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: | تفاصيل الكتالوج المقيدة | الوصول العام لا يحمل Bearer أو cookie مريض. | `medicineId` مقيد بالنمط قبل جلب upstream. | SSR يحجب السعر ومعرّف المريض والملفات؛ لا `Drug` أو ادعاء علاجي. | لا سلة أو checkout أو وصفة أو عملية تغيير. | [بوابة تف`
### backend_consumers_or_contracts
- `13: | نواة المريض والـBFF | cookies `httpOnly` وتجديد واحد مقيد؛ لا `localStorage`. | بوابة المتصفح تقبل `GET` للطلبات المدرجة فقط؛ لا عمليات كتابة. | فشل الاتصال يصير `503 upstream_unavailable` بلا حمولة حساسة. | لا رفع، لا دفع، لا تعديل بيانا`
- `31: | الاعتمادات | OpenAPI/DTO/response/error وقيود التشغيل الفعلي متوفرة قبل إظهار العملية؛ النقص يسجل كفجوة Backend. |`
### auth_ownership
- `5: يوحّد هذا الفهرس أدلة الأمن للدفعات **المنجزة فعلياً** في Web App للمريض حتى 20 أغسطس 2026. وهو لا يحوّل أي عقد Backend ناقص إلى رحلة مكتملة، ولا يعد دليلاً على ميزات غير مبنية. تتبع كل قراءة خاصة النموذج نفسه: جلسة في cookies `httpOnly`، ط`
- `13: | نواة المريض والـBFF | cookies `httpOnly` وتجديد واحد مقيد؛ لا `localStorage`. | بوابة المتصفح تقبل `GET` للطلبات المدرجة فقط؛ لا عمليات كتابة. | فشل الاتصال يصير `503 upstream_unavailable` بلا حمولة حساسة. | لا رفع، لا دفع، لا تعديل بيانا`
- `15: | تفاصيل الكتالوج المقيدة | الوصول العام لا يحمل Bearer أو cookie مريض. | `medicineId` مقيد بالنمط قبل جلب upstream. | SSR يحجب السعر ومعرّف المريض والملفات؛ لا `Drug` أو ادعاء علاجي. | لا سلة أو checkout أو وصفة أو عملية تغيير. | [بوابة تف`
- `16: | اكتشاف المحتوى العام | لا تفتح صفحة عامة جلسة مريض أو API خاص. | لا `patientId` أو معرفات حجوزات في sitemap؛ بحث الكتالوج محدود الإدخال. | robots و`X-Robots-Tag` يعزلان الخاص، وSSR يحجب السعر والبيانات الخاصة. | لا ملفات أو mutations عامة`
- `25: | التفويض | اختبار owner مقابل other عندما يحمل المسار معرف مورد؛ أو إثبات `401` بلا جلسة لمسار ذاتي لا يقبل معرفاً. |`
- `26: | الجلسة | لا توكن في URL أو HTML أو `localStorage`؛ refresh محدود ولا ينشئ جلسة بديلة عند الفشل. |`
- `35: هذا الفهرس لا يغلق الفجوات التي لا تملك عقداً خلفياً أو عملية ملكية قابلة للاختبار: OTP، تفاصيل الرعاية المنزلية، DTO هوية الملف وأسماء العائلة، تفاصيل الوصفات والمحادثات، الرفع وOCR، المكالمات/RTC، وتصنيف الكتالوج المنشور. متطلبات كل منها `
### state_transitions
- `31: | الاعتمادات | OpenAPI/DTO/response/error وقيود التشغيل الفعلي متوفرة قبل إظهار العملية؛ النقص يسجل كفجوة Backend. |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `31: | الاعتمادات | OpenAPI/DTO/response/error وقيود التشغيل الفعلي متوفرة قبل إظهار العملية؛ النقص يسجل كفجوة Backend. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
