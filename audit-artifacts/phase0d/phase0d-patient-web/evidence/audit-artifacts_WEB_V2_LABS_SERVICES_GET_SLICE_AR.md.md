# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_LABS_SERVICES_GET_SLICE_AR.md`
- **Member SHA-256:** `5e5488beaf2f90a9387fb70a1224ab453d3a919f455f0c5a82809aafa96a615e`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `31: | Production build | ناجح؛ ظهر route `/[locale]/diagnostics/labs` |`
### backend_consumers_or_contracts
- `5: **الحالة: منفذة محلياً، جاهزة للدفع بعد full gates، وليست Sandbox-verified.** أُغلقت القراءة العامة لخدمات المختبر عبر العقد الفعلي `GET /labs/services` الموجود في `LabsController.services`.`
- `9: المسار العام هو `GET /labs/services`، ويقبل فقط query parameters المثبتة في controller: `category`, `search`, `home_only`, `home_visit`, `highest_rated`, `nearest`, و`lowest_price`. لا تُرسل الصفحة أي Authorization أو session token لهذا الم`
- `19: أُضيف المسار `/[locale]/diagnostics/labs` بست لغات. يتضمن بحثاً، فلتر home collection، حالات error وempty حقيقية، وبطاقات تعرض الاسم والوصف والسعر والـsample type والتوافر. التصميم responsive وRTL-compatible ويستخدم حركة hover محدودة مع احت`
- `31: | Production build | ناجح؛ ظهر route `/[locale]/diagnostics/labs` |`
- `40: - `/home/ubuntu/nabdah_backend_work/src/modules/labs/labs.controller.ts`، تعريفات `GET /labs/services` وquery parameters.`
- `41: - `/home/ubuntu/nabdah_backend_work/src/modules/labs/labs.service.ts`، filtering وpublic eligibility وprojection behavior.`
### auth_ownership
- `9: المسار العام هو `GET /labs/services`، ويقبل فقط query parameters المثبتة في controller: `category`, `search`, `home_only`, `home_visit`, `highest_rated`, `nearest`, و`lowest_price`. لا تُرسل الصفحة أي Authorization أو session token لهذا الم`
### state_transitions
- `19: أُضيف المسار `/[locale]/diagnostics/labs` بست لغات. يتضمن بحثاً، فلتر home collection، حالات error وempty حقيقية، وبطاقات تعرض الاسم والوصف والسعر والـsample type والتوافر. التصميم responsive وRTL-compatible ويستخدم حركة hover محدودة مع احت`
### payment_insurance_relevance
- `9: المسار العام هو `GET /labs/services`، ويقبل فقط query parameters المثبتة في controller: `category`, `search`, `home_only`, `home_visit`, `highest_rated`, `nearest`, و`lowest_price`. لا تُرسل الصفحة أي Authorization أو session token لهذا الم`
- `15: يحتفظ parser بالحقول العامة اللازمة للعرض فقط: `id`, الأسماء والوصف بالعربية والإنجليزية، `short_code`, `category`, `sample_type`, `price`, `old_price`, متطلبات الصيام، التوافر المنزلي أو داخل المنشأة، زمن النتيجة، تعليمات التحضير، التوافر `
- `28: | Targeted total | 3 files / 5 tests ناجحة |`
### error_empty_loading_retry_cancel
- `19: أُضيف المسار `/[locale]/diagnostics/labs` بست لغات. يتضمن بحثاً، فلتر home collection، حالات error وempty حقيقية، وبطاقات تعرض الاسم والوصف والسعر والـsample type والتوافر. التصميم responsive وRTL-compatible ويستخدم حركة hover محدودة مع احت`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
