# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE6_NOTIFICATION_SETTINGS_JOURNEY_AR.md`
- **Member SHA-256:** `8a9346acabf0e7f210a242e164863924827a1886a2fa5719c68d998c4d3c69c9`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: أضيفت صفحة `/[locale]/notifications/settings` لتغطية canonical mobile route `/settings/notifications-settings` بدل legacy redirect الذي لا يملك UI فعليًا.`
### backend_consumers_or_contracts
- `5: أضيفت صفحة `/[locale]/notifications/settings` لتغطية canonical mobile route `/settings/notifications-settings` بدل legacy redirect الذي لا يملك UI فعليًا.`
### auth_ownership
- `11: لم أضف Switch أو PATCH من المتصفح. كود الموبايل الحالي يرسل PATCH، لكن إدخاله إلى الويب يحتاج إغلاق CSRF، ownership، authorization، optimistic rollback، error state، audit logging، وcontract schema. لذلك تعرض الويب الحالة المؤكدة أو `غير مت`
### state_transitions
- `11: لم أضف Switch أو PATCH من المتصفح. كود الموبايل الحالي يرسل PATCH، لكن إدخاله إلى الويب يحتاج إغلاق CSRF، ownership، authorization، optimistic rollback، error state، audit logging، وcontract schema. لذلك تعرض الويب الحالة المؤكدة أو `غير مت`
### payment_insurance_relevance
- `7: الصفحة تقرأ `/users/me/notification-settings` عبر server-only boundary وتعرض القيم boolean المعروفة فقط: general، appointments، orders، offers، medications، doctorMessages، emergency، sound، vibration. قيمة emergency تظهر مقفلة بصريًا مثل ا`
### error_empty_loading_retry_cancel
- `11: لم أضف Switch أو PATCH من المتصفح. كود الموبايل الحالي يرسل PATCH، لكن إدخاله إلى الويب يحتاج إغلاق CSRF، ownership، authorization، optimistic rollback، error state، audit logging، وcontract schema. لذلك تعرض الويب الحالة المؤكدة أو `غير مت`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
