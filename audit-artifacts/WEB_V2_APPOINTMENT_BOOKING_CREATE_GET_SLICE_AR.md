# Consultation Appointment Booking + Detail — Contract Slice

## الحكم

**الحالة: منفذة ومختبرة محلياً، جاهزة للدفع؛ live booking flow يحتاج حساب Sandbox معتمداً قبل تشغيل mutation فعلي.** تم التنفيذ بناءً على `POST /unified-bookings` وقراءة تفاصيل appointment الحالية من `/care/appointments/{id}`، مع احترام عقد `Idempotency-Key` وقفل الموعد الموجود في backend.

## ما تم تنفيذه

أُضيف BFF route: `POST /api/appointments/book`. يتحقق الخادمي من `doctor_id` كـUUID، ومن `type` ضمن `clinic/video/home`، ومن `slot_id`، ومن وجود `Idempotency-Key` بطول صالح. يقرأ access session من cookie `httpOnly` فقط، ثم يمرر الطلب إلى `/unified-bookings` مع المفتاح نفسه. الاستجابة تُختزل إلى `booking_id` و`status` (`pending_payment` أو `confirmed`) ولا يُعاد أي patient/internal field.

أُضيف إلى Doctor Detail نموذج اختيار الموعد المتاح الذي جاء من GET الحقيقي فقط. عند الضغط، ينشأ idempotency key واحد لكل اختيار، ويُرسل النموذج مرة واحدة مع disabled/loading state. بعد نجاح backend ينتقل المستخدم إلى `/appointments/{booking_id}`؛ لا يوجد نجاح محلي أو حجز وهمي. `pending_payment` لا يتحول إلى confirmed من الواجهة.

صفحة appointment detail الحالية تستمر بعرض البيانات المصرح بها فقط عبر server-side access session، وتحول 401 إلى login و403/404 إلى notFound، ولا تعرض payment/call actions في هذه الشريحة.

## الأمان والصدق

لا يصل access token أو Idempotency-Key إلى URL أو localStorage. لا يقبل BFF الحجز بدون access cookie أو idempotency key. يتم تمرير access token من الخادم إلى backend، ولا يُعاد raw upstream response. حالات `401` و`409 slot_taken` وأخطاء upstream تظهر كحالات فشل صادقة دون إنشاء مورد بديل.

قفل الموعد لمدة عشر دقائق وreplay semantics يطبقهما backend interceptor/service؛ أُثبت في الاختبارات أن المفتاح يصل كما هو، لكن لا أدّعي إثبات replay حي أو تزاحم حي بدون حساب Sandbox معتمد.

## الاختبارات والبوابات

| البوابة | النتيجة |
|---|---|
| Booking BFF contract tests | **1 file / 4 tests ناجحة** |
| Doctor Detail SSR + Login regression | 3 files / 7 tests ناجحة |
| Full Vitest | **123 files ناجحة، 14 متجاوزة؛ 233 tests ناجحة، 23 متجاوزة** |
| Type-check | ناجح |
| Production build | ناجح؛ ظهر `/api/appointments/book` |
| Sandbox mutation flow | غير مشغل؛ `NABD_SANDBOX_*` غير موجودة |

## ما بقي محجوباً

Payment intent/checkout، cancel، reschedule، وcall-token ليست جزءاً من هذا commit. ستبقى كل واحدة خلف شريحتها وعقدها واختبارات replay/ownership الخاصة بها. لا يتم اعتبار `pending_payment` دفعاً ناجحاً، ولا يتم إضافة payment method من الواجهة قبل عقد الدفع المنشور.

## مراجع محلية

- `/home/ubuntu/nabdah_backend_work/src/modules/unified-bookings/unified-bookings.module.ts`: `create`, `getOne`, idempotency annotations، وresponse contract.
- `/home/ubuntu/nabdah_impl/repo/app/[locale]/consultations/doctors/[doctorId]/page.tsx`: مصدر slots الحية ونقطة ربط نموذج الحجز.
- `/home/ubuntu/nabdah_impl/repo/app/api/appointments/book/route.test.ts`: اختبارات authentication، idempotency، whitelist، و409.
