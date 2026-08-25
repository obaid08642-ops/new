# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE9_PERFORMANCE_REVIEW_AR.md`
- **Member SHA-256:** `5b8f745aa19c4fc213bc264f0a35a263cb04bb07fdbde0030058db42b03107d4`
- **Line count:** 16
- **Read range:** `1-16`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: Production build نجح بعد تحديث postcss، وNext.js ولّد 16 static route مع بقية المسارات dynamic/server-rendered. صورة standalone مهيأة في Dockerfile، ولا توجد حاجة لعرض secrets داخل build.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `9: لا توجد في بيئة التدقيق أدوات Browser/Lighthouse أو RUM تقيس LCP, INP, CLS, TTFB، ولا اختبار network throttling أو device CPU. لذلك لا يمكن إعلان سرعة إنتاجية أو Core Web Vitals ناجحة بناءً على حجم ملفات `.next` فقط. يجب تشغيل قياس على بيئة`
- `11: يلزم كذلك التحقق من caching headers للكتالوج العام فقط، منع caching للبيانات الخاصة، abort/timeout لكل request، عدم تكرار fetch في server components، lazy loading للميزات الثقيلة، وتحقيق streaming/skeleton دون إظهار بيانات قديمة أو mock.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `9: لا توجد في بيئة التدقيق أدوات Browser/Lighthouse أو RUM تقيس LCP, INP, CLS, TTFB، ولا اختبار network throttling أو device CPU. لذلك لا يمكن إعلان سرعة إنتاجية أو Core Web Vitals ناجحة بناءً على حجم ملفات `.next` فقط. يجب تشغيل قياس على بيئة`
- `11: يلزم كذلك التحقق من caching headers للكتالوج العام فقط، منع caching للبيانات الخاصة، abort/timeout لكل request، عدم تكرار fetch في server components، lazy loading للميزات الثقيلة، وتحقيق streaming/skeleton دون إظهار بيانات قديمة أو mock.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
