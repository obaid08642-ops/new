# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/149_pharmacy_orders_visual_check_20260822.md`
- **Member SHA-256:** `5e40f9ac43e312e0eafdf67c186139a3ed6f304b6ef7be20152de878c5d9eda9`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: تعمل واجهتا السلة والطلبات محلياً في RTL وتحافظان على عرض قراءة فقط. هذه نتيجة تحقق محلي وليست نشر إنتاجي. لقطة السلة محفوظة في `/home/ubuntu/screenshots/localhost_2026-08-22_00-59-43_9084.webp` ولقطة الطلبات في `/home/ubuntu/screenshots/lo`
- `19: **لقطات إضافية:** `/home/ubuntu/screenshots/localhost_2026-08-22_01-03-48_3527.webp` و`/home/ubuntu/screenshots/localhost_2026-08-22_01-04-01_1822.webp`.`
- `27: **لقطة تفاصيل الدواء:** `/home/ubuntu/screenshots/localhost_2026-08-22_01-07-24_4899.webp`.`
### backend_consumers_or_contracts
- `10: | `/ar/orders` | ناجح | رأس طلبات وتبويبات حالة وحالة فراغ واسعة وواضحة | حساب Sandbox لا يملك طلبات؛ لم تُدرج بطاقة أو حالة أو سعر بديل. |`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
