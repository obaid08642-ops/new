# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE6_APPOINTMENTS_JOURNEY_AR.md`
- **Member SHA-256:** `d6fc2d0a9013aa0ce76a108365b53133f24255103509b66c9f400c7b0484297d`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: - `past`: `completed` و`cancelled`.`
- `14: لم تتم إضافة أفعال `cancel/reschedule/join/rebook` إلى الويب لأن هذه mutation/RTC flows تحتاج عقودًا وصلاحيات وownership وواجهات تشغيل منفصلة؛ إضافة أزرار شكلية كانت ستخالف قاعدة عدم وجود وظائف وهمية.`
- `33: هذه مطابقة لقائمة المواعيد، وليست مطابقة كاملة لتدفق consultations الضخم في React Native، الذي يشمل doctor search وspecialty filters وinsurance وbooking وwaiting room وRTC.`
### backend_consumers_or_contracts
- `5: تمت مطابقة قائمة المواعيد Web مع شاشة `consultations/appointments.tsx` في React Native على مستوى الحالات المثبتة من endpoint `/care/appointments`:`
### auth_ownership
- `12: - status colors متسقة مع tokens الموبايل.`
- `14: لم تتم إضافة أفعال `cancel/reschedule/join/rebook` إلى الويب لأن هذه mutation/RTC flows تحتاج عقودًا وصلاحيات وownership وواجهات تشغيل منفصلة؛ إضافة أزرار شكلية كانت ستخالف قاعدة عدم وجود وظائف وهمية.`
### state_transitions
- `7: - `upcoming`: `confirmed` و`pending`.`
- `8: - `past`: `completed` و`cancelled`.`
- `9: - tab navigation عبر query state قابل للمشاركة.`
- `10: - empty state مستقل لكل تبويب.`
- `12: - status colors متسقة مع tokens الموبايل.`
- `14: لم تتم إضافة أفعال `cancel/reschedule/join/rebook` إلى الويب لأن هذه mutation/RTC flows تحتاج عقودًا وصلاحيات وownership وواجهات تشغيل منفصلة؛ إضافة أزرار شكلية كانت ستخالف قاعدة عدم وجود وظائف وهمية.`
### payment_insurance_relevance
- `33: هذه مطابقة لقائمة المواعيد، وليست مطابقة كاملة لتدفق consultations الضخم في React Native، الذي يشمل doctor search وspecialty filters وinsurance وbooking وwaiting room وRTC.`
### error_empty_loading_retry_cancel
- `7: - `upcoming`: `confirmed` و`pending`.`
- `8: - `past`: `completed` و`cancelled`.`
- `10: - empty state مستقل لكل تبويب.`
- `14: لم تتم إضافة أفعال `cancel/reschedule/join/rebook` إلى الويب لأن هذه mutation/RTC flows تحتاج عقودًا وصلاحيات وownership وواجهات تشغيل منفصلة؛ إضافة أزرار شكلية كانت ستخالف قاعدة عدم وجود وظائف وهمية.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
