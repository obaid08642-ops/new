# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/ERROR_CODE_REGISTRY_REVIEW_DRAFT_20260817.md`
- **Member SHA-256:** `f4214e076551ac15452ca79692e1e79d5230474d64b34457d75f6ec8768586ad`
- **Line count:** 56
- **Read range:** `1-56`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `16: "retryable": false,`
- `38: | `system` | `SYSTEM_TEMPORARY_UNAVAILABLE`, `SYSTEM_CONFIGURATION_ERROR` | retry policy محدد دون stack trace |`
- `50: يجب أن يحمل كل response `request_id` غير حساس، وأن يسجل backend correlation وroute وactor hash وcode وstatus وlatency. لا يتم تسجيل access token أو OTP أو payment secret أو raw health payload. يجب ربط error event بـaudit عند security/consen`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `13: "code": "AUTH_OTP_EXPIRED",`
- `18: "message_key": "errors.auth.otp_expired",`
- `30: | `authentication` | `AUTH_INVALID_CREDENTIALS`, `AUTH_OTP_EXPIRED`, `AUTH_2FA_REQUIRED` | لا يكشف وجود الحساب أو سبباً يسهل enumeration |`
- `31: | `authorization` | `AUTH_FORBIDDEN`, `AUTH_NOT_PARTICIPANT`, `AUTH_RESOURCE_NOT_OWNED` | response عام، والتفصيل في server audit |`
- `46: كل `message_key` يحتاج Arabic وEnglish وبقية اللغات المعتمدة، مع fallback آمن لا يكشف code internals. لا تُرسل ترجمة من client locale إلى server authorization. واجهة المستخدم تعرض إجراءً واضحاً فقط عندما يكون `user_action` مسجلاً.`
- `50: يجب أن يحمل كل response `request_id` غير حساس، وأن يسجل backend correlation وroute وactor hash وcode وstatus وlatency. لا يتم تسجيل access token أو OTP أو payment secret أو raw health payload. يجب ربط error event بـaudit عند security/consen`
### state_transitions
- `1: # Nabdah Error-Code Registry — Review Draft`
- `7: يعرّف السجل عقداً ثابتاً للأخطاء بين backend وتطبيق المريض وتطبيق المزود ولوحة الإدارة. وجود رسالة نصية أو HTTP status غير كافٍ لتحديد سلوك العميل. إلى أن يعتمد registry، لا يجوز تغيير جميع المسارات دفعة واحدة؛ المسارات الحالية تبقى كما هي،`
- `14: "http_status": 401,`
- `16: "retryable": false,`
- `18: "message_key": "errors.auth.otp_expired",`
- `34: | `conflict` | `CONFLICT_IDEMPOTENCY`, `CONFLICT_STATE_TRANSITION` | يعيد state آمن وrequest id |`
- `36: | `security` | `SECURITY_REPLAY_DETECTED`, `SECURITY_ORIGIN_REJECTED` | details داخلية فقط |`
- `38: | `system` | `SYSTEM_TEMPORARY_UNAVAILABLE`, `SYSTEM_CONFIGURATION_ERROR` | retry policy محدد دون stack trace |`
- `42: لا يجب أن يُستخدم HTTP status بديلاً عن code. `401` للمصادقة المفقودة/غير الصالحة، `403` للرفض بعد التحقق، `404` عندما يكون عدم وجود المورد آمناً للكشف، `409` لتعارض state/idempotency، `422` للمدخلات الصالحة شكلياً وغير المقبولة تعاقدياً، و`
- `50: يجب أن يحمل كل response `request_id` غير حساس، وأن يسجل backend correlation وroute وactor hash وcode وstatus وlatency. لا يتم تسجيل access token أو OTP أو payment secret أو raw health payload. يجب ربط error event بـaudit عند security/consen`
- `54: لا يُعتمد registry قبل جرد الأكواد الحالية، إزالة collisions، ربط كل endpoint، إضافة catalogs للغات، واختبارات contract تمنع تغيير code أو status بلا مراجعة. الأكواد الحساسة الجديدة مثل consent وQR تبقى `*_CONTRACT_NOT_ACTIVE` حتى اعتماد Ga`
### payment_insurance_relevance
- `35: | `payment` | `PAYMENT_DECLINED`, `PAYMENT_WEBHOOK_INVALID`, `PAYMENT_DUPLICATE` | لا يكشف بيانات البطاقة أو توقيع webhook |`
- `50: يجب أن يحمل كل response `request_id` غير حساس، وأن يسجل backend correlation وroute وactor hash وcode وstatus وlatency. لا يتم تسجيل access token أو OTP أو payment secret أو raw health payload. يجب ربط error event بـaudit عند security/consen`
### error_empty_loading_retry_cancel
- `1: # Nabdah Error-Code Registry — Review Draft`
- `16: "retryable": false,`
- `18: "message_key": "errors.auth.otp_expired",`
- `38: | `system` | `SYSTEM_TEMPORARY_UNAVAILABLE`, `SYSTEM_CONFIGURATION_ERROR` | retry policy محدد دون stack trace |`
- `50: يجب أن يحمل كل response `request_id` غير حساس، وأن يسجل backend correlation وroute وactor hash وcode وstatus وlatency. لا يتم تسجيل access token أو OTP أو payment secret أو raw health payload. يجب ربط error event بـaudit عند security/consen`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
