# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/PHASE6_ADVANCED_FEATURES_BLOCKER_REVIEW_AR.md`
- **Member SHA-256:** `49b482a2940f3aceadeaebbdc9127ab0f3526b00cbfc4cc63d9103bda0cc4e12`
- **Line count:** 68
- **Read range:** `1-68`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: توجد في Mobile شاشات كثيرة لا يقابلها Web route مستقل حالياً. بعضها قد يكون feature غير منشور بعقد backend، وبعضها حساس طبياً أو مالياً ولا يجوز تنفيذه اعتماداً على UI Mobile أو mock. لذلك صنفتها كـ`Blocked-on-contract` أو `Needs clinical/f`
- `22: | Returns | لا توجد صفحة Web كاملة | route live محتمل، لكن يحتاج payload، evidence upload، refund policy وidempotency |`
- `24: | Reviews/ratings | لا توجد رحلة Web مكتملة | محجوب حتى anti-abuse وownership/booking linkage |`
- `28: لا تُعتبر شاشات Mobile التي تستعمل `apiFetch` دليلاً على أن العقد صالح للإنتاج؛ Mobile نفسه قد يحتوي guest fallback أو optimistic/local state. لا يُضاف route Web أو زر mutation حتى تثبت ضربة method/path الحية، DTO، authentication، ownership`
- `49: أعيد فحص عدد من المسارات المتقدمة دون جلسة. المسارات التي أعادت 401 موجودة ومحميّة، لكنها لا تُفعّل تلقائياً قبل DTO/ownership/replay/Sandbox. المسارات التي أعادت 404 لا يُبنى لها Web route.`
- `61: | GET | `/maternity/dashboard` | 404 | لا يُبنى route حتى نشر العقد |`
- `62: | GET | `/nutrition/plan` | 404 | لا يُبنى route حتى نشر العقد |`
- `65: | POST | `/pharmacy/returns` | 401 | عقد موجود؛ يحتاج payload/evidence/refund/idempotency |`
### backend_consumers_or_contracts
- `59: | GET | `/wallet/balance` | 401 | عقد مالي محمي؛ يحتاج reconciliation وKYC policy |`
- `60: | GET | `/wallet/transactions` | 401 | عقد مالي محمي؛ يحتاج pagination/audit |`
- `65: | POST | `/pharmacy/returns` | 401 | عقد موجود؛ يحتاج payload/evidence/refund/idempotency |`
### auth_ownership
- `15: | Community posts/vote/comment | لا توجد صفحات Web | محجوب حتى moderation، abuse controls، ownership وmutation contracts |`
- `24: | Reviews/ratings | لا توجد رحلة Web مكتملة | محجوب حتى anti-abuse وownership/booking linkage |`
- `28: لا تُعتبر شاشات Mobile التي تستعمل `apiFetch` دليلاً على أن العقد صالح للإنتاج؛ Mobile نفسه قد يحتوي guest fallback أو optimistic/local state. لا يُضاف route Web أو زر mutation حتى تثبت ضربة method/path الحية، DTO، authentication، ownership`
- `49: أعيد فحص عدد من المسارات المتقدمة دون جلسة. المسارات التي أعادت 401 موجودة ومحميّة، لكنها لا تُفعّل تلقائياً قبل DTO/ownership/replay/Sandbox. المسارات التي أعادت 404 لا يُبنى لها Web route.`
- `54: | GET | `/community/posts/{id}` | 401 | عقد محمي يحتاج owner/public classification |`
- `57: | POST | `/community/posts/{id}/comment` | 401 | mutation يحتاج abuse/ownership controls |`
### state_transitions
- `17: | Maternity | لا توجد صفحات Web | محجوب حتى clinical state contract ومراجعة سلامة |`
- `22: | Returns | لا توجد صفحة Web كاملة | route live محتمل، لكن يحتاج payload، evidence upload، refund policy وidempotency |`
- `28: لا تُعتبر شاشات Mobile التي تستعمل `apiFetch` دليلاً على أن العقد صالح للإنتاج؛ Mobile نفسه قد يحتوي guest fallback أو optimistic/local state. لا يُضاف route Web أو زر mutation حتى تثبت ضربة method/path الحية، DTO، authentication، ownership`
- `51: | Method | Path | Status | قرار |`
- `65: | POST | `/pharmacy/returns` | 401 | عقد موجود؛ يحتاج payload/evidence/refund/idempotency |`
### payment_insurance_relevance
- `19: | Wallet/transfers/cards | لا توجد صفحات Web | محجوب حتى payment/ledger/KYC وreconciliation contracts |`
- `22: | Returns | لا توجد صفحة Web كاملة | route live محتمل، لكن يحتاج payload، evidence upload، refund policy وidempotency |`
- `59: | GET | `/wallet/balance` | 401 | عقد مالي محمي؛ يحتاج reconciliation وKYC policy |`
- `60: | GET | `/wallet/transactions` | 401 | عقد مالي محمي؛ يحتاج pagination/audit |`
- `65: | POST | `/pharmacy/returns` | 401 | عقد موجود؛ يحتاج payload/evidence/refund/idempotency |`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
