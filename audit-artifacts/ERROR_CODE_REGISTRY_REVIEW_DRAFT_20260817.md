# Nabdah Error-Code Registry — Review Draft

**الحالة:** مسودة مراجعة فقط — غير مفعّلة

## الهدف

يعرّف السجل عقداً ثابتاً للأخطاء بين backend وتطبيق المريض وتطبيق المزود ولوحة الإدارة. وجود رسالة نصية أو HTTP status غير كافٍ لتحديد سلوك العميل. إلى أن يعتمد registry، لا يجوز تغيير جميع المسارات دفعة واحدة؛ المسارات الحالية تبقى كما هي، وأي كود جديد غير مسجل يرفض في CI أو يسجل كـunknown داخلياً دون كشف تفاصيل حساسة.

## شكل الخطأ المقترح

```json
{
  "code": "AUTH_OTP_EXPIRED",
  "http_status": 401,
  "category": "authentication",
  "retryable": false,
  "user_action": "request_new_code",
  "message_key": "errors.auth.otp_expired",
  "request_id": "opaque-correlation-id",
  "details": null
}
```

`code` ثابت وغير مترجم. `message_key` يحدد الترجمة من catalog معتمد. `details` لا يحتوي stack trace أو query أو secret أو بيانات صحية، ويجب allowlist حقوله لكل كود.

## التصنيف الأولي

| Category | أمثلة مقترحة | القاعدة |
|---|---|---|
| `authentication` | `AUTH_INVALID_CREDENTIALS`, `AUTH_OTP_EXPIRED`, `AUTH_2FA_REQUIRED` | لا يكشف وجود الحساب أو سبباً يسهل enumeration |
| `authorization` | `AUTH_FORBIDDEN`, `AUTH_NOT_PARTICIPANT`, `AUTH_RESOURCE_NOT_OWNED` | response عام، والتفصيل في server audit |
| `validation` | `VALIDATION_INVALID_INPUT`, `VALIDATION_UNSUPPORTED_SCOPE` | يعرض حقولاً allowlisted فقط |
| `resource` | `RESOURCE_NOT_FOUND`, `RESOURCE_UNAVAILABLE` | لا يفرق عند الحاجة بين عدم الوجود وعدم الإتاحة |
| `conflict` | `CONFLICT_IDEMPOTENCY`, `CONFLICT_STATE_TRANSITION` | يعيد state آمن وrequest id |
| `payment` | `PAYMENT_DECLINED`, `PAYMENT_WEBHOOK_INVALID`, `PAYMENT_DUPLICATE` | لا يكشف بيانات البطاقة أو توقيع webhook |
| `security` | `SECURITY_REPLAY_DETECTED`, `SECURITY_ORIGIN_REJECTED` | details داخلية فقط |
| `contract` | `CONSENT_CONTRACT_NOT_ACTIVE`, `QR_CONTRACT_NOT_ACTIVE` | fail-closed قبل اعتماد العقد |
| `system` | `SYSTEM_TEMPORARY_UNAVAILABLE`, `SYSTEM_CONFIGURATION_ERROR` | retry policy محدد دون stack trace |

## HTTP mapping

لا يجب أن يُستخدم HTTP status بديلاً عن code. `401` للمصادقة المفقودة/غير الصالحة، `403` للرفض بعد التحقق، `404` عندما يكون عدم وجود المورد آمناً للكشف، `409` لتعارض state/idempotency، `422` للمدخلات الصالحة شكلياً وغير المقبولة تعاقدياً، و`429` للـrate limit، مع مراجعة كل endpoint قبل اعتماد المصفوفة.

## Localization

كل `message_key` يحتاج Arabic وEnglish وبقية اللغات المعتمدة، مع fallback آمن لا يكشف code internals. لا تُرسل ترجمة من client locale إلى server authorization. واجهة المستخدم تعرض إجراءً واضحاً فقط عندما يكون `user_action` مسجلاً.

## Correlation وobservability

يجب أن يحمل كل response `request_id` غير حساس، وأن يسجل backend correlation وroute وactor hash وcode وstatus وlatency. لا يتم تسجيل access token أو OTP أو payment secret أو raw health payload. يجب ربط error event بـaudit عند security/consent/QR/payment دون تكرار بيانات حساسة.

## Fail-closed acceptance criteria

لا يُعتمد registry قبل جرد الأكواد الحالية، إزالة collisions، ربط كل endpoint، إضافة catalogs للغات، واختبارات contract تمنع تغيير code أو status بلا مراجعة. الأكواد الحساسة الجديدة مثل consent وQR تبقى `*_CONTRACT_NOT_ACTIVE` حتى اعتماد Gatekeeper والمالك.

**قرار المراجعة:** DRAFT — NOT ACTIVE — لا تغييرات تشغيلية.
