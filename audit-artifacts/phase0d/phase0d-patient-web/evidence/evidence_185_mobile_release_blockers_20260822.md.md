# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/185_mobile_release_blockers_20260822.md`
- **Member SHA-256:** `e283e5e079d8095536252e80e984148555a5452fd13b664561d28c03999ce038`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | MSEC-014 وMSEC-015 | P1 | كلمة مرور في route params وكلمة افتراضية متوقعة لتحويل الضيف | تسريب أو استيلاء محتمل على الحساب | معاملة مؤقتة محمية في الذاكرة أو رمز صادر من الباك إند؛ منع أي كلمة افتراضية. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: | MSEC-009 وMSEC-011 | P1 | حفظ طلبات غير متصلة كاملة مع headers وبيانات حساسة في AsyncStorage | بقاء PHI أو Authorization في تخزين غير مشفر | حذف Authorization، مخطط سماحي مصغّر، تخزين مشفر، TTL والتحقق قبل التشغيل. |`
### state_transitions
- `11: | MDATA-008 | P1 | تحويل mutation غير المتصل إلى استجابة نجاح وهمية | تقدم حالة المستخدم من دون تأكيد دائم من الخادم | نوع pending/failure مفصول ولا قيمة مجال مصطنعة. |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: | MDATA-008 | P1 | تحويل mutation غير المتصل إلى استجابة نجاح وهمية | تقدم حالة المستخدم من دون تأكيد دائم من الخادم | نوع pending/failure مفصول ولا قيمة مجال مصطنعة. |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
