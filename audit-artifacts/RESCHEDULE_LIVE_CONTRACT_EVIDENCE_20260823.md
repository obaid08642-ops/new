# Reschedule live contract evidence

تم استخراج أسماء المسارات من OpenAPI المرجعي المحلي:

- `/api/v1/care/appointments/{id}/reschedule`
- `/api/v1/labs/bookings/{id}/reschedule`
- `/api/v1/radiology/bookings/{id}/reschedule`
- `/api/v1/unified-bookings/{kind}/{id}/reschedule`

ومن controller backend المتاح:

- `POST /unified-bookings/{id}/reschedule` يستدعي consultation reschedule.
- `POST /unified-bookings/{kind}/{id}/reschedule` يستدعي النوع العام.
- body يُقرأ من `new_slot_id` أو `scheduled_at`، والسبب اختياري.
- المساران يستخدمان `IdempotencyInterceptor` و`require-idempotency`.
- consultation service ينفذ `apptSvc.reschedule(id, user, { slot_start: new_scheduled_at })`.
- الخدمة ترفض الموعد الماضي وتتحقق من ownership داخل appointment service.

مصدر API الحي: `https://api.nabd.plus/api/v1`. فحص OPTIONS الآمن للمسار العام أعاد HTTP 204، ولم يُرسل أي body أو بيانات شخصية أو mutation فعلي.

ملاحظة: `/home/ubuntu/nabdah_backend_work` workspace مفكوك بلا `.git` metadata محلياً، لذلك لم يُدّعَ فحص branch remote من هذا workspace.
