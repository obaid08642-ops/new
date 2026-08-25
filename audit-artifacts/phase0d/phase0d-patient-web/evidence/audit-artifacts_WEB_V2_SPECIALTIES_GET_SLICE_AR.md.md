# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_SPECIALTIES_GET_SLICE_AR.md`
- **Member SHA-256:** `cd8dfafbfc27c6170877d706bac862a87f30e3ef47f2df974484f46976a3eeeb`
- **Line count:** 22
- **Read range:** `1-22`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `22: هذا slice لا ينفذ booking أو doctor search أو أي mutation. ربط التخصص بالـappointments يمرر query محليًا فقط، ولا يدّعي أن appointment booking أصبح منفذًا. أي create/cancel/reschedule يبقى خلف Contract Pack والعقد الحي واختبارات idempotency`
### backend_consumers_or_contracts
- `5: تم تنفيذ `/[locale]/consultations/specialties` من العقد الحقيقي `GET /api/v1/care/specialties` المطابق لاستدعاء Mobile `apiFetch('/care/specialties')` في `app/consultations/specialty-select.tsx`. الصفحة عامة للـdiscovery ولا ترسل patient se`
### auth_ownership
- `5: تم تنفيذ `/[locale]/consultations/specialties` من العقد الحقيقي `GET /api/v1/care/specialties` المطابق لاستدعاء Mobile `apiFetch('/care/specialties')` في `app/consultations/specialty-select.tsx`. الصفحة عامة للـdiscovery ولا ترسل patient se`
- `14: - server wrapper: public request بلا Authorization ولا token.`
- `15: - SSR: display fields فقط، لا access token/PII، وفشل upstream بلا fallback.`
### state_transitions
- `7: أضيف parser مقيد يحافظ فقط على `slug`, `name_ar/name`, `name_en`, و`count/provider_count`، ويسقط `patient_id` وأي fields داخلية. لا توجد قائمة ثابتة أو أعداد أطباء مصطنعة. عند فشل upstream تظهر unavailable state بدل بيانات بديلة.`
- `22: هذا slice لا ينفذ booking أو doctor search أو أي mutation. ربط التخصص بالـappointments يمرر query محليًا فقط، ولا يدّعي أن appointment booking أصبح منفذًا. أي create/cancel/reschedule يبقى خلف Contract Pack والعقد الحي واختبارات idempotency`
### payment_insurance_relevance
- `13: - parser: payload array/data/items، إسقاط الحقول غير الموثقة، وعدم fallback.`
### error_empty_loading_retry_cancel
- `22: هذا slice لا ينفذ booking أو doctor search أو أي mutation. ربط التخصص بالـappointments يمرر query محليًا فقط، ولا يدّعي أن appointment booking أصبح منفذًا. أي create/cancel/reschedule يبقى خلف Contract Pack والعقد الحي واختبارات idempotency`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
