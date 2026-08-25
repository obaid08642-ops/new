# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/154_phase6_pharmacy_orders_completion_20260822.md`
- **Member SHA-256:** `ff20e836be5688471ffd43bf4443c5adb535b26562fde0f3c932afdc1a45e234`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | `/[locale]/cart` و`/[locale]/cart/checkout` | قراءة محسنة ومختبرة | لا تعديل للسلة ولا إجراء دفع أو إتمام طلب. |`
### backend_consumers_or_contracts
- `15: | `/[locale]/orders` و`/[locale]/orders/[orderId]` و`tracking` | قوائم وتفاصيل وتتبع قراءة فقط | لا إلغاء أو إعادة طلب أو تعديل للعنوان. |`
### auth_ownership
- `22: تطلب حزمة العقود المرجعية إضافة `GET /prescriptions/{id}` بتفويض Bearer، وتحقيق ملكية، وDTO محدود للحقول المناسبة. لذلك أصبحت شاشة التفاصيل تعرض رسالة **«محجوب بانتظار عقد تفاصيل الوصفة المصرح به»** في اللغات الست بدلاً من إعادة استخدام قائ`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
