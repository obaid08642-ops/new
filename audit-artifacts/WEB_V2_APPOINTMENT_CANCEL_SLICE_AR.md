# Consultation Appointment Cancel — Contract Slice

## الحكم

**منفذة ومختبرة محلياً ومهيأة للدفع؛ لم يُشغّل mutation حي لغياب حسابات Sandbox المعتمدة.**

## العقد

تمت مطابقة controller/backend مع `POST /api/v1/unified-bookings/{kind}/{id}/cancel`، واستخدمت الشريحة kind=`consultation`. يثبت backend وجود `IdempotencyInterceptor` و`require-idempotency`، كما يطبق owner isolation ويرجع 404 للمورد غير المملوك حسب خدمة الموعد.

## التنفيذ

أُضيف `POST /api/appointments/[appointmentId]/cancel` في BFF. يتحقق من UUID، reason بطول لا يتجاوز 500، Idempotency-Key بطول صالح، وaccess cookie خادمية. لا يمرر أي browser token أو raw booking response، ويعيد `{ok:true}` فقط عند نجاح upstream. أخطاء 401/404/409/upstream تبقى أخطاء صادقة.

أُضيفت AppointmentActions إلى detail page للحالات القابلة للإلغاء فقط، مع تأكيد، سبب اختياري، disabled/loading state، refresh من الخادم بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. الحالات النهائية لا تعرض زر الإلغاء.

## الاختبارات والبوابات

| Gate | Result |
|---|---|
| Cancel BFF tests | 1 file / 3 tests passed |
| Appointment SSR regression | 1 file / 3 tests passed |
| Full Vitest | **128 files passed، 14 skipped؛ 245 tests passed، 23 skipped** |
| Type-check | passed |
| Production build | passed؛ ظهر `/api/appointments/[appointmentId]/cancel` |
| Live owner/stranger/replay | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |

## الحدود

لم تُنفذ reschedule أو call-token في هذه الشريحة. لا أدّعي إثبات replay/transition الحي قبل تشغيل الحسابات المعتمدة. أي عقد آخر غير مثبت يبقى محجوباً.
