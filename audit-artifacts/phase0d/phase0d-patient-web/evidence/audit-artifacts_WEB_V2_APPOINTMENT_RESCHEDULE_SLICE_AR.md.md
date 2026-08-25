# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_APPOINTMENT_RESCHEDULE_SLICE_AR.md`
- **Member SHA-256:** `f2fc5ad54fea7dc9e6b2eed2c5c66ce34ecce37ce57aae6d95f8118f8fa286d1`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Consultation Appointment Reschedule — Contract Slice`
- `9: تمت مطابقة مسار consultation مع `PATCH /api/v1/unified-bookings/consultation/{id}/reschedule`. التحقق الحي دون جلسة أعاد 401 للـPATCH، بينما أعاد 404 للـPOST؛ لذلك لا يُستخدم POST ولا `:kind` في BFF. يقبل backend `new_slot_id` أو `scheduled`
- `13: أُضيف BFF إلى `PATCH /api/appointments/[appointmentId]/reschedule`. يتحقق من UUID، وجود موعد مستقبلي أو slot id، reason بطول 500، Idempotency-Key بطول 16–128، وaccess cookie خادمية. لا تمرر الواجهة access token ولا raw booking response، ويع`
- `21: | Reschedule BFF tests | 1 file / 3 tests passed |`
- `25: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/reschedule` |`
- `26: | Live method probe | PATCH=401 دون جلسة؛ POST=404؛ محفوظ في `full-audit-20260823/reschedule-method-probe.tsv` |`
- `31: لا تُعد واجهة datetime بديلاً عن slot availability backend؛ backend هو مصدر الحقيقة ويرفض الوقت غير المتاح أو الماضي. لم تُنفذ call-token في هذه الشريحة، ولا يُعتبر reschedule نجاحاً إلا من استجابة العقد الحي.`
### backend_consumers_or_contracts
- `9: تمت مطابقة مسار consultation مع `PATCH /api/v1/unified-bookings/consultation/{id}/reschedule`. التحقق الحي دون جلسة أعاد 401 للـPATCH، بينما أعاد 404 للـPOST؛ لذلك لا يُستخدم POST ولا `:kind` في BFF. يقبل backend `new_slot_id` أو `scheduled`
- `13: أُضيف BFF إلى `PATCH /api/appointments/[appointmentId]/reschedule`. يتحقق من UUID، وجود موعد مستقبلي أو slot id، reason بطول 500، Idempotency-Key بطول 16–128، وaccess cookie خادمية. لا تمرر الواجهة access token ولا raw booking response، ويع`
- `25: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/reschedule` |`
### auth_ownership
- `13: أُضيف BFF إلى `PATCH /api/appointments/[appointmentId]/reschedule`. يتحقق من UUID، وجود موعد مستقبلي أو slot id، reason بطول 500، Idempotency-Key بطول 16–128، وaccess cookie خادمية. لا تمرر الواجهة access token ولا raw booking response، ويع`
- `15: أُضيف نموذج إعادة جدولة إلى Appointment Detail للحالات النشطة، مع datetime-local وminimum time، سبب اختياري، زر تأكيد، loading/disabled/error states، refresh بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. لا تُنشأ مواعيد أو slots وهمية.`
- `27: | Live owner/stranger/replay | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |`
- `31: لا تُعد واجهة datetime بديلاً عن slot availability backend؛ backend هو مصدر الحقيقة ويرفض الوقت غير المتاح أو الماضي. لم تُنفذ call-token في هذه الشريحة، ولا يُعتبر reschedule نجاحاً إلا من استجابة العقد الحي.`
### state_transitions
- `15: أُضيف نموذج إعادة جدولة إلى Appointment Detail للحالات النشطة، مع datetime-local وminimum time، سبب اختياري، زر تأكيد، loading/disabled/error states، refresh بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. لا تُنشأ مواعيد أو slots وهمية.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `15: أُضيف نموذج إعادة جدولة إلى Appointment Detail للحالات النشطة، مع datetime-local وminimum time، سبب اختياري، زر تأكيد، loading/disabled/error states، refresh بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. لا تُنشأ مواعيد أو slots وهمية.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
