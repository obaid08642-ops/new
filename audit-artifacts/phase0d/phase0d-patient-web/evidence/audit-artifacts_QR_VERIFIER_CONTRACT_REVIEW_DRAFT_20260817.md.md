# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/QR_VERIFIER_CONTRACT_REVIEW_DRAFT_20260817.md`
- **Member SHA-256:** `68e75e31a1625169eef2a90eb1a244b60902ca658e0df5ae2e71cfd408c4b831`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `18: | `sub` | subject/resource id، لا يُستخدم منفرداً لتجاوز authorization |`
- `26: يجب ألا يحتوي QR على diagnosis أو medication أو بيانات صحية خام. إذا احتاج verifier إلى بيانات إضافية، يجلبها backend بعد التحقق والـauthorization، وليس من payload قابل للنسخ.`
- `30: يجب التحقق بالترتيب من قابلية parsing، version، issuer، audience، key id، signature، timestamps، jti/nonce replay، purpose، resource binding، ثم authorization الحالي للمستخدم. فشل أي خطوة يعيد نتيجة عامة لا تكشف سبباً حساساً للعميل، مع reas`
- `38: QR appointment لا يصح إلا إذا كان المستخدم الحالي مشاركاً في appointment أو موظفاً مفوضاً ضمن المنشأة. QR document لا يفتح الوثيقة إلا لصاحبها أو actor له consent قائم. لا يجوز استبدال participant id من client body أو اعتبار provider role و`
- `50: لا يوجد endpoint تفعيل قبل اعتماد key registry، rotation، TTL، replay store، issuer/audience، ownership mapping، وسياسة audit. أي signature غير صالحة أو version غير معتمد أو clock skew خارج الحد أو resource غير مرتبط يعيد رفضاً. لا يُسمح بإ`
### state_transitions
- `42: الاستجابة الداخلية قد تحتوي `valid`, `purpose`, `resource_type`, `resource_id`, `expires_at`, `replay_status`، لكن العميل يحصل فقط على أقل نتيجة لازمة. عند الفشل العام يستخدم `QR_INVALID_OR_UNAVAILABLE`، ولا يفرق بين key غير موجود أو resour`
### payment_insurance_relevance
- `9: ## payload المقترح`
- `17: | `aud` | audience محدد، لا wildcard |`
- `26: يجب ألا يحتوي QR على diagnosis أو medication أو بيانات صحية خام. إذا احتاج verifier إلى بيانات إضافية، يجلبها backend بعد التحقق والـauthorization، وليس من payload قابل للنسخ.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
