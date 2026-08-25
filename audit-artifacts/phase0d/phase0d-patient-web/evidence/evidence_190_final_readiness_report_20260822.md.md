# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/190_final_readiness_report_20260822.md`
- **Member SHA-256:** `1cbd498cb83368423ea3c4f22e03ba91713597890ccbe17d3275a1d8a200893a`
- **Line count:** 58
- **Read range:** `1-58`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `20: | عمليات الكتابة الصحية والتجارية | **BLOCKED BY CONTRACT** | OTP، الدفع، تغييرات السلة، تعديل الملف، دعوة العائلة، وإضافة القياسات لا تبنى من دون OpenAPI ومفتاح idempotency. | لا يُسمح بتجاوزها، ولا توجد بدائل أو نجاحات وهمية. |`
- `40: | 5 | تحقق حي للأمن في مرشح النشر، لا في بيئة محلية فقط. | التقاط رؤوس CSP وCookies وHSTS ونتائج اختبارات الجلسة؛ يثبت منع السكربتات المضمنة غير المسموحة وخصائص `HttpOnly` و`Secure` و`SameSite` الملائمة. |`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
