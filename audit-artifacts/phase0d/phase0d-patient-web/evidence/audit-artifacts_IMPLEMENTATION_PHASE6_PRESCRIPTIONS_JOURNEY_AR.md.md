# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/IMPLEMENTATION_PHASE6_PRESCRIPTIONS_JOURNEY_AR.md`
- **Member SHA-256:** `9c7d0864c116fdeee1ec2af71dba0df60ca075e0f907e12a552ace50369798f4`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تمت مطابقة الجزء read-only من شاشة `health/prescriptions.tsx` في React Native على الويب، بإضافة اسم الطبيب وأسماء الأدوية إلى بطاقة الوصفة. يظل parser محصورًا في UUID وstate وcreatedAt وdoctorName وmedicationNames، ولا يعرض diagnosis أو not`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `5: تمت مطابقة الجزء read-only من شاشة `health/prescriptions.tsx` في React Native على الويب، بإضافة اسم الطبيب وأسماء الأدوية إلى بطاقة الوصفة. يظل parser محصورًا في UUID وstate وcreatedAt وdoctorName وmedicationNames، ولا يعرض diagnosis أو not`
### payment_insurance_relevance
- `11: فشل اختبار أولي لأن payload المرفق يستخدم `medicine_name_ar` داخل item، بينما parser كان يبحث عن `name`/`medicine_name` فقط. تمت إضافة aliases `medicine_name_ar` و`medicine_name_en` ثم نجح الاختبار؛ هذا يثبت دورة التنفيذ ثم المراجعة ثم التص`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
