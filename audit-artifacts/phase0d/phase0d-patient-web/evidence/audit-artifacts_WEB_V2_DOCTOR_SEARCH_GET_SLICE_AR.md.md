# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_DOCTOR_SEARCH_GET_SLICE_AR.md`
- **Member SHA-256:** `4fee0e28bb3a5e23c15e9133bfaec6a383056f78938b51c57a16f80a26807210`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: أضيفت ترجمة AR/EN/UR/HI/BN/FIL، وبحث accessible، focus states، glass hero/cards، active micro-interaction، و`prefers-reduced-motion`. تم تحويل روابط Specialty Select إلى Doctor Search بدل توجيه مضلل إلى booking.`
- `13: - `pnpm build`: PASS، وظهر route `/[locale]/consultations/doctors`.`
### backend_consumers_or_contracts
- `3: تم تنفيذ صفحة `/[locale]/consultations/doctors` من العقد العام الحقيقي `GET /api/v1/care/doctors` المطابق لاستدعاء Mobile `apiFetch('/care/doctors?search=...&sort=...')` في `consultations/doctor-search.tsx`.`
- `11: - targeted Doctor/Specialty/Home-care/Appointment SSR and parser tests: 8 files، 15 tests PASS.`
### auth_ownership
- `14: - لا ينفذ هذا slice إنشاء حجز أو دفع؛ تلك mutations تحتاج عقودًا مستقلة واختبارات owner/replay.`
### state_transitions
- `7: أضيفت ترجمة AR/EN/UR/HI/BN/FIL، وبحث accessible، focus states، glass hero/cards، active micro-interaction، و`prefers-reduced-motion`. تم تحويل روابط Specialty Select إلى Doctor Search بدل توجيه مضلل إلى booking.`
### payment_insurance_relevance
- `5: الصفحة تدعم search وspecialty وsort (`rating`, `price`, `wait`) عبر query parameters مقيدة، وتعرض فقط الاسم/الدرجة/التخصص والتقييم/السعر إذا أعادها backend. لا توجد قيم افتراضية للإحصاءات أو بيانات أطباء ثابتة. parser يسقط patient_id/phone `
- `7: أضيفت ترجمة AR/EN/UR/HI/BN/FIL، وبحث accessible، focus states، glass hero/cards، active micro-interaction، و`prefers-reduced-motion`. تم تحويل روابط Specialty Select إلى Doctor Search بدل توجيه مضلل إلى booking.`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
