# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `docs/mobile-aso-playbook.md`
- **Member SHA-256:** `1aea8c6c70e251c824664b69c9532def7850fe3aa45d6045e32996f508b83c1d`
- **Line count:** 56
- **Read range:** `1-56`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | التجارب | تجارب أصل المتجر في Play Console عند الجاهزية | Product Page Optimization | فرضية واحدة لكل تجربة، وقرار من بيانات لا من الانطباع |`
- `26: تُلتقط اللقطات من تطبيق فعلي بحساب اختبار معزول وبيانات منقحة أو شاشات لا تعرض أي سجل صحي. لا تستخدم Screenshots مولّدة لتقليد تدفقات غير موجودة، ولا تظهر أسماء مرضى أو أرقام جوال أو رموز جلسة أو نتائج مختبر أو بيانات تأمين. يلزم تقديم نسخ `
- `49: > تدعم Apple اختبار أيقونات ولقطات ومعاينات بديلة في Product Page Optimization؛ وتوصي بتطبيق نتيجة معالجة فقط بعد بلوغ دلالة مناسبة. [2]`
- `54: [2]: https://developer.apple.com/app-store/product-page-optimization/ "Apple Developer — Product page optimization"`
- `55: [3]: https://developer.apple.com/app-store/product-page/ "Apple Developer — Creating your product page"`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `30: | 1 | دخول المريض أو بوابة الخصوصية | لا تدخل بيانات حقيقية ولا تعد بوظيفة OTP غير الموثقة |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
