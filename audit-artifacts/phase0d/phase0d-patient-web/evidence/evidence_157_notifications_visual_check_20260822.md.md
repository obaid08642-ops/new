# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `evidence/157_notifications_visual_check_20260822.md`
- **Member SHA-256:** `f47f776162e83a8a500d57314492c331dedad18a2fc842833bbe7065abf3101c`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: تم التحقق محلياً من إزالة النص العربي الثابت من الرابط ومن قابلية شاشة الإشعارات للقراءة في RTL. لا تمثل النتيجة نشر إنتاجي. لقطة المصدر محفوظة في `/home/ubuntu/screenshots/localhost_2026-08-22_01-20-30_8678.webp`.`
### backend_consumers_or_contracts
- `9: | `/ar/notifications` | ناجح | ظهر رابط **«إعدادات الإشعارات»** مترجماً، وبطاقات إشعارات متدرجة ومؤشر عدم القراءة واضح | عرضت الواجهة العنوان والنص والوقت فقط بحسب بيانات Sandbox؛ بعض السجلات بلا عنوان فظهرت بتسمية «إشعار» الصادقة. لا تعليم`
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
