# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_APPOINTMENT_CANCEL_SLICE_AR.md`
- **Member SHA-256:** `3f27ad5ef47b05ca8bc8384cd9464f3cd7afa6515b1ee2d5e3f59c160789ea87`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Consultation Appointment Cancel — Contract Slice`
- `9: تمت مطابقة controller/backend مع `POST /api/v1/unified-bookings/{kind}/{id}/cancel`، واستخدمت الشريحة kind=`consultation`. يثبت backend وجود `IdempotencyInterceptor` و`require-idempotency`، كما يطبق owner isolation ويرجع 404 للمورد غير المم`
- `13: أُضيف `POST /api/appointments/[appointmentId]/cancel` في BFF. يتحقق من UUID، reason بطول لا يتجاوز 500، Idempotency-Key بطول صالح، وaccess cookie خادمية. لا يمرر أي browser token أو raw booking response، ويعيد `{ok:true}` فقط عند نجاح upstr`
- `15: أُضيفت AppointmentActions إلى detail page للحالات القابلة للإلغاء فقط، مع تأكيد، سبب اختياري، disabled/loading state، refresh من الخادم بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. الحالات النهائية لا تعرض زر الإلغاء.`
- `21: | Cancel BFF tests | 1 file / 3 tests passed |`
- `25: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/cancel` |`
- `30: لم تُنفذ reschedule أو call-token في هذه الشريحة. لا أدّعي إثبات replay/transition الحي قبل تشغيل الحسابات المعتمدة. أي عقد آخر غير مثبت يبقى محجوباً.`
### backend_consumers_or_contracts
- `9: تمت مطابقة controller/backend مع `POST /api/v1/unified-bookings/{kind}/{id}/cancel`، واستخدمت الشريحة kind=`consultation`. يثبت backend وجود `IdempotencyInterceptor` و`require-idempotency`، كما يطبق owner isolation ويرجع 404 للمورد غير المم`
- `13: أُضيف `POST /api/appointments/[appointmentId]/cancel` في BFF. يتحقق من UUID، reason بطول لا يتجاوز 500، Idempotency-Key بطول صالح، وaccess cookie خادمية. لا يمرر أي browser token أو raw booking response، ويعيد `{ok:true}` فقط عند نجاح upstr`
- `25: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/cancel` |`
### auth_ownership
- `9: تمت مطابقة controller/backend مع `POST /api/v1/unified-bookings/{kind}/{id}/cancel`، واستخدمت الشريحة kind=`consultation`. يثبت backend وجود `IdempotencyInterceptor` و`require-idempotency`، كما يطبق owner isolation ويرجع 404 للمورد غير المم`
- `13: أُضيف `POST /api/appointments/[appointmentId]/cancel` في BFF. يتحقق من UUID، reason بطول لا يتجاوز 500، Idempotency-Key بطول صالح، وaccess cookie خادمية. لا يمرر أي browser token أو raw booking response، ويعيد `{ok:true}` فقط عند نجاح upstr`
- `15: أُضيفت AppointmentActions إلى detail page للحالات القابلة للإلغاء فقط، مع تأكيد، سبب اختياري، disabled/loading state، refresh من الخادم بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. الحالات النهائية لا تعرض زر الإلغاء.`
- `26: | Live owner/stranger/replay | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |`
- `30: لم تُنفذ reschedule أو call-token في هذه الشريحة. لا أدّعي إثبات replay/transition الحي قبل تشغيل الحسابات المعتمدة. أي عقد آخر غير مثبت يبقى محجوباً.`
### state_transitions
- `1: # Consultation Appointment Cancel — Contract Slice`
- `9: تمت مطابقة controller/backend مع `POST /api/v1/unified-bookings/{kind}/{id}/cancel`، واستخدمت الشريحة kind=`consultation`. يثبت backend وجود `IdempotencyInterceptor` و`require-idempotency`، كما يطبق owner isolation ويرجع 404 للمورد غير المم`
- `13: أُضيف `POST /api/appointments/[appointmentId]/cancel` في BFF. يتحقق من UUID، reason بطول لا يتجاوز 500، Idempotency-Key بطول صالح، وaccess cookie خادمية. لا يمرر أي browser token أو raw booking response، ويعيد `{ok:true}` فقط عند نجاح upstr`
- `15: أُضيفت AppointmentActions إلى detail page للحالات القابلة للإلغاء فقط، مع تأكيد، سبب اختياري، disabled/loading state، refresh من الخادم بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. الحالات النهائية لا تعرض زر الإلغاء.`
- `21: | Cancel BFF tests | 1 file / 3 tests passed |`
- `25: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/cancel` |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: # Consultation Appointment Cancel — Contract Slice`
- `9: تمت مطابقة controller/backend مع `POST /api/v1/unified-bookings/{kind}/{id}/cancel`، واستخدمت الشريحة kind=`consultation`. يثبت backend وجود `IdempotencyInterceptor` و`require-idempotency`، كما يطبق owner isolation ويرجع 404 للمورد غير المم`
- `13: أُضيف `POST /api/appointments/[appointmentId]/cancel` في BFF. يتحقق من UUID، reason بطول لا يتجاوز 500، Idempotency-Key بطول صالح، وaccess cookie خادمية. لا يمرر أي browser token أو raw booking response، ويعيد `{ok:true}` فقط عند نجاح upstr`
- `15: أُضيفت AppointmentActions إلى detail page للحالات القابلة للإلغاء فقط، مع تأكيد، سبب اختياري، disabled/loading state، refresh من الخادم بعد نجاح backend فقط، وترجمات EN/AR/UR/HI/BN/FIL. الحالات النهائية لا تعرض زر الإلغاء.`
- `21: | Cancel BFF tests | 1 file / 3 tests passed |`
- `25: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/cancel` |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
