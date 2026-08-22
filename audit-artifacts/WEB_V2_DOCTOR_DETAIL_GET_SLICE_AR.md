# Contract Slice: Doctor Detail GET

## الحالة

**مغلقة ومختبرة — read-only parity slice.** أضيف المسار `/[locale]/consultations/doctors/[doctorId]` اعتماداً على العقد الحي `GET /api/v1/care/doctors/{id}` في `audit-artifacts/nabd-patient-api-openapi.json`.

## ما نُفّذ

| العنصر | التنفيذ | الدليل |
|---|---|---|
| SSR detail route | عرض تفاصيل الطبيب من upstream GET فقط | `app/[locale]/consultations/doctors/[doctorId]/page.tsx` |
| Public parser | استخراج الحقول العامة فقط: id, name, degree, specialty, rating, experience, facility وغيرها | `lib/api/doctors.ts` |
| Server wrapper | `getPublicDoctor` مع `cache: no-store` وAccept JSON ورفض identifier غير صالح | `lib/api/doctors-server.ts` |
| Security | لا Authorization header من المتصفح، لا token في body أو URL، والـ upstream 404 يتحول إلى `notFound()` | page/wrapper tests |
| Truthfulness | لا mock، ولا bio/availability/booking claims غير موجودة في response parser، ولا mutation CTA | الصفحة نفسها |
| i18n | مفاتيح العرض الجديدة في AR/EN/UR/HI/BN/FIL | `messages/*.json` |
| UX | بطاقة glass/gradient، hierarchy واضحة، responsive layout، back navigation، واحترام reduced motion الموروث | `doctors.module.css` |

## الاختبارات والبوابات

- Full Vitest: **115 passed، 14 skipped؛ 215 passed، 23 skipped**.
- Type-check (`pnpm check`): **ناجح**.
- Production build (`pnpm build`): **ناجح**.
- Targeted detail/parser/SSR: **3 ملفات، 3 اختبارات ناجحة**.

## حدود العقد

العقد الحالي يثبت GET detail فقط ولا يثبت slots أو حجزاً أو call-token أو payment. لذلك لا تخلق الصفحة أي mutation ولا تعرض بيانات availability مصطنعة. يمكن تنفيذ Doctor Slots كـslice مستقلة بعد مراجعة عقد `GET /api/v1/care/doctors/{id}/slots` وحقول response واختبار failure/empty states.

## قرار parity

Doctor Detail أصبح **implemented / verified GET**. Booking actions وslot selection تبقى **Deferred pending their own verified contract slice**، وفق Contract-First وZero-Mock policy.

## إضافة Doctor Slots GET

بعد مراجعة كود backend الفعلي، تم التحقق من `GET /api/v1/care/doctors/{id}/slots` ومدخلاته `date` و`service_type` وقيم الخدمات `clinic|video|home`. الاستجابة المثبتة هي `{ date, service_type, slots: [{ start, end, label, available }], reason? }`. أضيف parser لا يسمح بتسريب الحقول الزائدة، وwrapper server لا يرسل Authorization، وواجهة query-driven تعرض الفتحات المتاحة والمحجوزة وحالات `closed`/`no_slots` من backend فقط. لا يوجد اختيار slot ينفذ booking أو payment؛ تلك mutation منفصلة ومؤجلة إلى عقدها واختبار replay الخاص بها.

بوابات الإغلاق: full Vitest ناجح، type-check ناجح، production build ناجح. اختبارات slice: **3 ملفات، 4 اختبارات ناجحة**.
