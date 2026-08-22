# V2 Contract Slice — Medical Specialties

## التنفيذ

تم تنفيذ `/[locale]/consultations/specialties` من العقد الحقيقي `GET /api/v1/care/specialties` المطابق لاستدعاء Mobile `apiFetch('/care/specialties')` في `app/consultations/specialty-select.tsx`. الصفحة عامة للـdiscovery ولا ترسل patient session أو Authorization إلى upstream.

أضيف parser مقيد يحافظ فقط على `slug`, `name_ar/name`, `name_en`, و`count/provider_count`، ويسقط `patient_id` وأي fields داخلية. لا توجد قائمة ثابتة أو أعداد أطباء مصطنعة. عند فشل upstream تظهر unavailable state بدل بيانات بديلة.

أضيف server wrapper بمسار ثابت `/care/specialties` و`cache: no-store`، وصفحة بحث محلي، وروابط إلى appointments مع specialty encoded. أضيفت ترجمة للغات AR/EN/UR/HI/BN/FIL، مع CSS premium ومساحات واسعة وglass surface وحركة قصيرة، واحترام `prefers-reduced-motion`.

## الاختبارات

- parser: payload array/data/items، إسقاط الحقول غير الموثقة، وعدم fallback.
- server wrapper: public request بلا Authorization ولا token.
- SSR: display fields فقط، لا access token/PII، وفشل upstream بلا fallback.
- appointments SSR regression: الرابط الجديد لا يكسر الصفحة الحالية.
- `pnpm check`: ناجح.
- targeted: 4 files / 8 tests ناجحة.

## الحدود

هذا slice لا ينفذ booking أو doctor search أو أي mutation. ربط التخصص بالـappointments يمرر query محليًا فقط، ولا يدّعي أن appointment booking أصبح منفذًا. أي create/cancel/reschedule يبقى خلف Contract Pack والعقد الحي واختبارات idempotency المطلوبة.
