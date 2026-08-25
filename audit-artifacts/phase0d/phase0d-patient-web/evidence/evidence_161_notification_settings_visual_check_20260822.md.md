# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/161_notification_settings_visual_check_20260822.md`
- **Member SHA-256:** `278ceeb5150f19a017d7673b070e37801658efabe43b38a3af7591a44c0657ca`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: تعرض الشاشة بوضوح أن إعدادات الإشعارات للقراءة فقط حتى يتحقق عقد تحديث آمن. لا يمثل التحقق محلياً نشر إنتاجي. لقطة المصدر محفوظة في `/home/ubuntu/screenshots/localhost_2026-08-22_01-26-38_8181.webp`.`
### backend_consumers_or_contracts
- `9: | `/ar/notifications/settings` | ناجح | رأس واضح وبطاقات تفضيلات ذات شارات حالة متسقة؛ تظهر فئة الطوارئ كحالة «مطلوب» | أعادت Sandbox قيماً غير متاحة لمعظم التفضيلات؛ عرضتها الواجهة كـ«غير متاح» بلا بدائل، ولم تعرض أي عناصر تعديل أو حافظة م`
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
