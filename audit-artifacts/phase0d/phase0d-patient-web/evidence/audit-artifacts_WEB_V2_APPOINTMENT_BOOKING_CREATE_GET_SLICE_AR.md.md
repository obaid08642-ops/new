# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_APPOINTMENT_BOOKING_CREATE_GET_SLICE_AR.md`
- **Member SHA-256:** `d413f1bce98e18d92a1153326ee62feb0493bc7f1a45e00356d6a1c602ad649b`
- **Line count:** 40
- **Read range:** `1-40`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Consultation Appointment Booking + Detail — Contract Slice`
- `5: **الحالة: منفذة ومختبرة محلياً، جاهزة للدفع؛ live booking flow يحتاج حساب Sandbox معتمداً قبل تشغيل mutation فعلي.** تم التنفيذ بناءً على `POST /unified-bookings` وقراءة تفاصيل appointment الحالية من `/care/appointments/{id}`، مع احترام عقد`
- `9: أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/`
- `11: أُضيف إلى Doctor Detail نموذج اختيار الموعد المتاح الذي جاء من GET الحقيقي فقط. عند الضغط، ينشأ idempotency key واحد لكل اختيار، ويُرسل النموذج مرة واحدة مع disabled/loading state. بعد نجاح backend ينتقل المستخدم إلى `/appointments/{booking`
- `13: صفحة appointment detail الحالية تستمر بعرض البيانات المصرح بها فقط عبر server-side access session، وتحول 401 إلى login و403/404 إلى notFound، ولا تعرض payment/call actions في هذه الشريحة.`
- `25: | Booking BFF contract tests | **1 file / 4 tests ناجحة** |`
- `26: | Doctor Detail SSR + Login regression | 3 files / 7 tests ناجحة |`
- `29: | Production build | ناجح؛ ظهر `/api/appointments/book` |`
- `34: Payment intent/checkout، cancel، reschedule، وcall-token ليست جزءاً من هذا commit. ستبقى كل واحدة خلف شريحتها وعقدها واختبارات replay/ownership الخاصة بها. لا يتم اعتبار `pending_payment` دفعاً ناجحاً، ولا يتم إضافة payment method من الواجه`
- `38: - `/home/ubuntu/nabdah_backend_work/src/modules/unified-bookings/unified-bookings.module.ts`: `create`, `getOne`, idempotency annotations، وresponse contract.`
- `39: - `/home/ubuntu/nabdah_impl/repo/app/[locale]/consultations/doctors/[doctorId]/page.tsx`: مصدر slots الحية ونقطة ربط نموذج الحجز.`
- `40: - `/home/ubuntu/nabdah_impl/repo/app/api/appointments/book/route.test.ts`: اختبارات authentication، idempotency، whitelist، و409.`
### backend_consumers_or_contracts
- `5: **الحالة: منفذة ومختبرة محلياً، جاهزة للدفع؛ live booking flow يحتاج حساب Sandbox معتمداً قبل تشغيل mutation فعلي.** تم التنفيذ بناءً على `POST /unified-bookings` وقراءة تفاصيل appointment الحالية من `/care/appointments/{id}`، مع احترام عقد`
- `9: أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/`
- `11: أُضيف إلى Doctor Detail نموذج اختيار الموعد المتاح الذي جاء من GET الحقيقي فقط. عند الضغط، ينشأ idempotency key واحد لكل اختيار، ويُرسل النموذج مرة واحدة مع disabled/loading state. بعد نجاح backend ينتقل المستخدم إلى `/appointments/{booking`
- `29: | Production build | ناجح؛ ظهر `/api/appointments/book` |`
- `40: - `/home/ubuntu/nabdah_impl/repo/app/api/appointments/book/route.test.ts`: اختبارات authentication، idempotency، whitelist، و409.`
### auth_ownership
- `9: أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/`
- `13: صفحة appointment detail الحالية تستمر بعرض البيانات المصرح بها فقط عبر server-side access session، وتحول 401 إلى login و403/404 إلى notFound، ولا تعرض payment/call actions في هذه الشريحة.`
- `17: لا يصل access token أو Idempotency-Key إلى URL أو localStorage. لا يقبل BFF الحجز بدون access cookie أو idempotency key. يتم تمرير access token من الخادم إلى backend، ولا يُعاد raw upstream response. حالات `401` و`409 slot_taken` وأخطاء ups`
- `26: | Doctor Detail SSR + Login regression | 3 files / 7 tests ناجحة |`
- `34: Payment intent/checkout، cancel، reschedule، وcall-token ليست جزءاً من هذا commit. ستبقى كل واحدة خلف شريحتها وعقدها واختبارات replay/ownership الخاصة بها. لا يتم اعتبار `pending_payment` دفعاً ناجحاً، ولا يتم إضافة payment method من الواجه`
### state_transitions
- `9: أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/`
- `11: أُضيف إلى Doctor Detail نموذج اختيار الموعد المتاح الذي جاء من GET الحقيقي فقط. عند الضغط، ينشأ idempotency key واحد لكل اختيار، ويُرسل النموذج مرة واحدة مع disabled/loading state. بعد نجاح backend ينتقل المستخدم إلى `/appointments/{booking`
- `34: Payment intent/checkout، cancel، reschedule، وcall-token ليست جزءاً من هذا commit. ستبقى كل واحدة خلف شريحتها وعقدها واختبارات replay/ownership الخاصة بها. لا يتم اعتبار `pending_payment` دفعاً ناجحاً، ولا يتم إضافة payment method من الواجه`
### payment_insurance_relevance
- `9: أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/`
- `11: أُضيف إلى Doctor Detail نموذج اختيار الموعد المتاح الذي جاء من GET الحقيقي فقط. عند الضغط، ينشأ idempotency key واحد لكل اختيار، ويُرسل النموذج مرة واحدة مع disabled/loading state. بعد نجاح backend ينتقل المستخدم إلى `/appointments/{booking`
- `13: صفحة appointment detail الحالية تستمر بعرض البيانات المصرح بها فقط عبر server-side access session، وتحول 401 إلى login و403/404 إلى notFound، ولا تعرض payment/call actions في هذه الشريحة.`
- `34: Payment intent/checkout، cancel، reschedule، وcall-token ليست جزءاً من هذا commit. ستبقى كل واحدة خلف شريحتها وعقدها واختبارات replay/ownership الخاصة بها. لا يتم اعتبار `pending_payment` دفعاً ناجحاً، ولا يتم إضافة payment method من الواجه`
### error_empty_loading_retry_cancel
- `9: أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/`
- `11: أُضيف إلى Doctor Detail نموذج اختيار الموعد المتاح الذي جاء من GET الحقيقي فقط. عند الضغط، ينشأ idempotency key واحد لكل اختيار، ويُرسل النموذج مرة واحدة مع disabled/loading state. بعد نجاح backend ينتقل المستخدم إلى `/appointments/{booking`
- `34: Payment intent/checkout، cancel، reschedule، وcall-token ليست جزءاً من هذا commit. ستبقى كل واحدة خلف شريحتها وعقدها واختبارات replay/ownership الخاصة بها. لا يتم اعتبار `pending_payment` دفعاً ناجحاً، ولا يتم إضافة payment method من الواجه`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
