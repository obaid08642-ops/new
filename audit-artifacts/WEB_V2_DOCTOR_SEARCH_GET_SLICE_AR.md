# V2 Contract Slice — Doctor Search

تم تنفيذ صفحة `/[locale]/consultations/doctors` من العقد العام الحقيقي `GET /api/v1/care/doctors` المطابق لاستدعاء Mobile `apiFetch('/care/doctors?search=...&sort=...')` في `consultations/doctor-search.tsx`.

الصفحة تدعم search وspecialty وsort (`rating`, `price`, `wait`) عبر query parameters مقيدة، وتعرض فقط الاسم/الدرجة/التخصص والتقييم/السعر إذا أعادها backend. لا توجد قيم افتراضية للإحصاءات أو بيانات أطباء ثابتة. parser يسقط patient_id/phone والحقول غير الموثقة، ويقبل identifiers آمنة فقط.

أضيفت ترجمة AR/EN/UR/HI/BN/FIL، وبحث accessible، focus states، glass hero/cards، active micro-interaction، و`prefers-reduced-motion`. تم تحويل روابط Specialty Select إلى Doctor Search بدل توجيه مضلل إلى booking.

## Gates

- targeted Doctor/Specialty/Home-care/Appointment SSR and parser tests: 8 files، 15 tests PASS.
- `pnpm check`: PASS.
- `pnpm build`: PASS، وظهر route `/[locale]/consultations/doctors`.
- لا ينفذ هذا slice إنشاء حجز أو دفع؛ تلك mutations تحتاج عقودًا مستقلة واختبارات owner/replay.
