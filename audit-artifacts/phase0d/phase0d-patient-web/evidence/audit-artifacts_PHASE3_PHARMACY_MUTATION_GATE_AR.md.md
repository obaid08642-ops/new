# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE3_PHARMACY_MUTATION_GATE_AR.md`
- **Member SHA-256:** `2994b29078f81c9ea53d653e46cd3e9af29929428a2013cb4172d39c49ab40bf`
- **Line count:** 9
- **Read range:** `1-9`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `3: فحصنا مصدر Backend المرفق والمواصفة الحقيقية. CartController يربط البيانات بـ`CurrentUser` ويستخدم `patient_id` داخل CartService، وPharmacyOrderService يتحقق من patient role و`patient_account_id` عند create/update/submit/cancel/detail. هذا `
- `5: الناقص قبل فتح mutation هو idempotency/replay contract للـCart add/update/remove/clear وPharmacy create/update/submit/cancel، وrequest/response DTOs مستقرة، error schema، CSRF strategy، transition rules، ومصفوفة owner/stranger فعلية على San`
- `9: القرار: نُبقي cart writes وorder create/update/submit/cancel وcheckout/payment/upload/chat/reorder محجوبة في BFF. نواصل تنفيذ GET/read-only contracts التي تثبتها OpenAPI، وعند توفر Sandbox env وcontract idempotency نشغل 200 للمالك و403/404 `
### backend_consumers_or_contracts
- `5: الناقص قبل فتح mutation هو idempotency/replay contract للـCart add/update/remove/clear وPharmacy create/update/submit/cancel، وrequest/response DTOs مستقرة، error schema، CSRF strategy، transition rules، ومصفوفة owner/stranger فعلية على San`
### auth_ownership
- `3: فحصنا مصدر Backend المرفق والمواصفة الحقيقية. CartController يربط البيانات بـ`CurrentUser` ويستخدم `patient_id` داخل CartService، وPharmacyOrderService يتحقق من patient role و`patient_account_id` عند create/update/submit/cancel/detail. هذا `
- `5: الناقص قبل فتح mutation هو idempotency/replay contract للـCart add/update/remove/clear وPharmacy create/update/submit/cancel، وrequest/response DTOs مستقرة، error schema، CSRF strategy، transition rules، ومصفوفة owner/stranger فعلية على San`
- `7: مواصفة البناء تطلب اختبار owner/stranger. لكن متغيرات Sandbox المطلوبة (`RUN_SANDBOX_TESTS`, `NABD_API_BASE_URL`, وحسابا owner/other) غير موجودة في البيئة الحالية، لذلك لم يتم الادعاء بتشغيل اختبار حي. الاختبارات المحلية تثبت allowlist وSSR`
### state_transitions
- `3: فحصنا مصدر Backend المرفق والمواصفة الحقيقية. CartController يربط البيانات بـ`CurrentUser` ويستخدم `patient_id` داخل CartService، وPharmacyOrderService يتحقق من patient role و`patient_account_id` عند create/update/submit/cancel/detail. هذا `
- `5: الناقص قبل فتح mutation هو idempotency/replay contract للـCart add/update/remove/clear وPharmacy create/update/submit/cancel، وrequest/response DTOs مستقرة، error schema، CSRF strategy، transition rules، ومصفوفة owner/stranger فعلية على San`
- `9: القرار: نُبقي cart writes وorder create/update/submit/cancel وcheckout/payment/upload/chat/reorder محجوبة في BFF. نواصل تنفيذ GET/read-only contracts التي تثبتها OpenAPI، وعند توفر Sandbox env وcontract idempotency نشغل 200 للمالك و403/404 `
### payment_insurance_relevance
- `9: القرار: نُبقي cart writes وorder create/update/submit/cancel وcheckout/payment/upload/chat/reorder محجوبة في BFF. نواصل تنفيذ GET/read-only contracts التي تثبتها OpenAPI، وعند توفر Sandbox env وcontract idempotency نشغل 200 للمالك و403/404 `
### error_empty_loading_retry_cancel
- `3: فحصنا مصدر Backend المرفق والمواصفة الحقيقية. CartController يربط البيانات بـ`CurrentUser` ويستخدم `patient_id` داخل CartService، وPharmacyOrderService يتحقق من patient role و`patient_account_id` عند create/update/submit/cancel/detail. هذا `
- `5: الناقص قبل فتح mutation هو idempotency/replay contract للـCart add/update/remove/clear وPharmacy create/update/submit/cancel، وrequest/response DTOs مستقرة، error schema، CSRF strategy، transition rules، ومصفوفة owner/stranger فعلية على San`
- `9: القرار: نُبقي cart writes وorder create/update/submit/cancel وcheckout/payment/upload/chat/reorder محجوبة في BFF. نواصل تنفيذ GET/read-only contracts التي تثبتها OpenAPI، وعند توفر Sandbox env وcontract idempotency نشغل 200 للمالك و403/404 `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
