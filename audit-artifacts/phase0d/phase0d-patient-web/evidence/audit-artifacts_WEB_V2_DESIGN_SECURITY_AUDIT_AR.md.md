# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_DESIGN_SECURITY_AUDIT_AR.md`
- **Member SHA-256:** `412f2e9803315b42a391e34c0cf4d6ed97d1beced578b8e8ea41e43a640bd57b`
- **Line count:** 17
- **Read range:** `1-17`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: الظهور النصي لـ`patient_id` و`access-token` موجود داخل tests فقط لإثبات الإسقاط وعدم التسريب. الفحص على production page/wrapper لا يجد `localStorage`, `sessionStorage`, `document.cookie`, أو token-bearing Authorization header. public wrappe`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: تمت مراجعة Specialty Select وHome-care Services بعد التنفيذ. كلاهما يعمل عبر server wrappers عامة لمسارات GET ثابتة، ولا يرسل Authorization أو session cookies يدويًا. الـparsers يسقطان fields غير الموثقة مثل `patient_id` ولا يقدمان fallback`
- `13: الظهور النصي لـ`patient_id` و`access-token` موجود داخل tests فقط لإثبات الإسقاط وعدم التسريب. الفحص على production page/wrapper لا يجد `localStorage`, `sessionStorage`, `document.cookie`, أو token-bearing Authorization header. public wrappe`
- `17: `pnpm test:sandbox` لم يُغلق في بيئة التنفيذ الحالية لأن حسابات sandbox الثلاثة غير موجودة (`NABD_SANDBOX_BASE_URL`, `NABD_SANDBOX_OWNER_EMAIL`, `NABD_SANDBOX_OWNER_PASSWORD`). هذه حالة `BLOCKED_ENV` وليست PASS مصطنعة ولا فشلًا وظيفيًا مثبت`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
