# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_DOCTOR_DETAIL_GET_SLICE_AR.md`
- **Member SHA-256:** `01608e4d728fb67de98700c5b0e090b81d666fbd4b3365b150129f4212c060f4`
- **Line count:** 38
- **Read range:** `1-38`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | SSR detail route | عرض تفاصيل الطبيب من upstream GET فقط | `app/[locale]/consultations/doctors/[doctorId]/page.tsx` |`
- `14: | Security | لا Authorization header من المتصفح، لا token في body أو URL، والـ upstream 404 يتحول إلى `notFound()` | page/wrapper tests |`
- `15: | Truthfulness | لا mock، ولا bio/availability/booking claims غير موجودة في response parser، ولا mutation CTA | الصفحة نفسها |`
- `32: Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.`
- `36: بعد مراجعة كود backend الفعلي، تم التحقق من `GET /api/v1/care/doctors/{id}/slots` ومدخلاته `date` و`service_type` وقيم الخدمات `clinic|video|home`. الاستجابة المثبتة هي `{ date, service_type, slots: [{ start, end, label, available }], reaso`
### backend_consumers_or_contracts
- `5: **مغلقة ومختبرة — read-only parity slice.** أضيف المسار `/[locale]/consultations/doctors/[doctorId]` اعتماداً على العقد الحي `GET /api/v1/care/doctors/{id}` في `audit-artifacts/nabd-patient-api-openapi.json`.`
- `12: | Public parser | استخراج الحقول العامة فقط: id, name, degree, specialty, rating, experience, facility وغيرها | `lib/api/doctors.ts` |`
- `13: | Server wrapper | `getPublicDoctor` مع `cache: no-store` وAccept JSON ورفض identifier غير صالح | `lib/api/doctors-server.ts` |`
- `28: العقد الحالي يثبت GET detail فقط ولا يثبت slots أو حجزاً أو call-token أو payment. لذلك لا تخلق الصفحة أي mutation ولا تعرض بيانات availability مصطنعة. يمكن تنفيذ Doctor Slots كـslice مستقلة بعد مراجعة عقد `GET /api/v1/care/doctors/{id}/slo`
- `36: بعد مراجعة كود backend الفعلي، تم التحقق من `GET /api/v1/care/doctors/{id}/slots` ومدخلاته `date` و`service_type` وقيم الخدمات `clinic|video|home`. الاستجابة المثبتة هي `{ date, service_type, slots: [{ start, end, label, available }], reaso`
### auth_ownership
- `14: | Security | لا Authorization header من المتصفح، لا token في body أو URL، والـ upstream 404 يتحول إلى `notFound()` | page/wrapper tests |`
- `28: العقد الحالي يثبت GET detail فقط ولا يثبت slots أو حجزاً أو call-token أو payment. لذلك لا تخلق الصفحة أي mutation ولا تعرض بيانات availability مصطنعة. يمكن تنفيذ Doctor Slots كـslice مستقلة بعد مراجعة عقد `GET /api/v1/care/doctors/{id}/slo`
- `36: بعد مراجعة كود backend الفعلي، تم التحقق من `GET /api/v1/care/doctors/{id}/slots` ومدخلاته `date` و`service_type` وقيم الخدمات `clinic|video|home`. الاستجابة المثبتة هي `{ date, service_type, slots: [{ start, end, label, available }], reaso`
### state_transitions
- `28: العقد الحالي يثبت GET detail فقط ولا يثبت slots أو حجزاً أو call-token أو payment. لذلك لا تخلق الصفحة أي mutation ولا تعرض بيانات availability مصطنعة. يمكن تنفيذ Doctor Slots كـslice مستقلة بعد مراجعة عقد `GET /api/v1/care/doctors/{id}/slo`
- `32: Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.`
### payment_insurance_relevance
- `28: العقد الحالي يثبت GET detail فقط ولا يثبت slots أو حجزاً أو call-token أو payment. لذلك لا تخلق الصفحة أي mutation ولا تعرض بيانات availability مصطنعة. يمكن تنفيذ Doctor Slots كـslice مستقلة بعد مراجعة عقد `GET /api/v1/care/doctors/{id}/slo`
- `36: بعد مراجعة كود backend الفعلي، تم التحقق من `GET /api/v1/care/doctors/{id}/slots` ومدخلاته `date` و`service_type` وقيم الخدمات `clinic|video|home`. الاستجابة المثبتة هي `{ date, service_type, slots: [{ start, end, label, available }], reaso`
### error_empty_loading_retry_cancel
- `28: العقد الحالي يثبت GET detail فقط ولا يثبت slots أو حجزاً أو call-token أو payment. لذلك لا تخلق الصفحة أي mutation ولا تعرض بيانات availability مصطنعة. يمكن تنفيذ Doctor Slots كـslice مستقلة بعد مراجعة عقد `GET /api/v1/care/doctors/{id}/slo`
- `32: Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
