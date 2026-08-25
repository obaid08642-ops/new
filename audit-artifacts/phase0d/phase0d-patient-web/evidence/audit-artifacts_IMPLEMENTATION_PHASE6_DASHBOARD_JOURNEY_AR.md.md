# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE6_DASHBOARD_JOURNEY_AR.md`
- **Member SHA-256:** `182f53890c996e2ba753c479b5cd73ca239695c0eca89118cd3e168eec17aa66`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: تُجرى القراءتان بالتوازي عبر `Promise.allSettled`. إذا أعاد أي عقد `401` تتم إعادة التوجيه إلى login. إذا فشل الاتصال أو كان payload فارغًا، تعرض الصفحة حالة محايدة ولا تنشئ بيانات بديلة. حقول العرض محدودة إلى name/doctor/date/status، ولا ت`
- `21: | Dashboard page visual shell test | 1/1 Pass |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `10: لم يتم تمرير access token إلى browser، ولم تتم إضافة هذه المسارات إلى browser BFF allowlist؛ القراءة تتم من Server Component عبر access token الموجود في cookie server-side.`
- `14: تُجرى القراءتان بالتوازي عبر `Promise.allSettled`. إذا أعاد أي عقد `401` تتم إعادة التوجيه إلى login. إذا فشل الاتصال أو كان payload فارغًا، تعرض الصفحة حالة محايدة ولا تنشئ بيانات بديلة. حقول العرض محدودة إلى name/doctor/date/status، ولا ت`
### state_transitions
- `14: تُجرى القراءتان بالتوازي عبر `Promise.allSettled`. إذا أعاد أي عقد `401` تتم إعادة التوجيه إلى login. إذا فشل الاتصال أو كان payload فارغًا، تعرض الصفحة حالة محايدة ولا تنشئ بيانات بديلة. حقول العرض محدودة إلى name/doctor/date/status، ولا ت`
- `29: هذه أول رحلة صغيرة من Home parity وليست تنفيذًا كاملًا لشاشة React Native؛ فما زالت reminders، nutrition، maternity، mood، vitals، emergency، triage، وfull home states تحتاج عقودًا واختبارات مستقلة قبل إدخالها إلى Dashboard Web.`
### payment_insurance_relevance
- `8: - `/home/upcoming-appointment` لعرض الموعد القادم بعد اشتراط `id` ثابت وعدم عرض payload ناقص كموعد حقيقي.`
- `14: تُجرى القراءتان بالتوازي عبر `Promise.allSettled`. إذا أعاد أي عقد `401` تتم إعادة التوجيه إلى login. إذا فشل الاتصال أو كان payload فارغًا، تعرض الصفحة حالة محايدة ولا تنشئ بيانات بديلة. حقول العرض محدودة إلى name/doctor/date/status، ولا ت`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
