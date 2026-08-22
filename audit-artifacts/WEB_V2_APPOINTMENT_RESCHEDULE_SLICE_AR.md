# Consultation Appointment Reschedule — Contract Slice

## الحكم

**منفذة ومختبرة محلياً ومهيأة للدفع؛ لم يُرسل mutation حقيقي إلى الإنتاج لغياب حسابات Sandbox المعتمدة.**

## العقد

تمت مطابقة مسار consultation مع `PATCH /api/v1/unified-bookings/consultation/{id}/reschedule`. التحقق الحي دون جلسة أعاد 401 للـPATCH، بينما أعاد 404 للـPOST؛ لذلك لا يُستخدم POST ولا `:kind` في BFF. يقبل backend `new_slot_id` أو `scheduled_at` وreason اختياري، ويطبق `IdempotencyInterceptor` و`require-idempotency`. في هذه الشريحة تُرسل `scheduled_at` بصيغة ISO مع offset بعد اختيار المستخدم لتاريخ/وقت مستقبلي.

## التنفيذ

أُضيف BFF إلى `PATCH /api/appointments/[appointmentId]/reschedule`. يتحقق من UUID، وجود موعد مستقبلي أو slot id، reason بطول 500، Idempotency-Key بطول 16–128، وaccess cookie خادمية. لا تمرر الواجهة access token ولا raw booking response، ويعاد `{ok:true}` فقط عند نجاح upstream. أخطاء 401/404/409/upstream تبقى صادقة.

أُضيف نموذج إعادة جدولة إلى Appointment Detail للحالات النشطة، مع datetime-local وminimum time، سبب اختياري، زر تأكيد، loading/disabled/error states، refresh بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. لا تُنشأ مواعيد أو slots وهمية.

## الاختبارات والبوابات

| Gate | Result |
|---|---|
| Reschedule BFF tests | 1 file / 3 tests passed |
| Appointment SSR regression | 1 file / 3 tests passed |
| Full Vitest | **129 files passed، 14 skipped؛ 248 tests passed، 23 skipped** |
| Type-check | passed |
| Production build | passed؛ ظهر `/api/appointments/[appointmentId]/reschedule` |
| Live method probe | PATCH=401 دون جلسة؛ POST=404؛ محفوظ في `full-audit-20260823/reschedule-method-probe.tsv` |
| Live owner/stranger/replay | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |

## الحدود

لا تُعد واجهة datetime بديلاً عن slot availability backend؛ backend هو مصدر الحقيقة ويرفض الوقت غير المتاح أو الماضي. لم تُنفذ call-token في هذه الشريحة، ولا يُعتبر reschedule نجاحاً إلا من استجابة العقد الحي.
