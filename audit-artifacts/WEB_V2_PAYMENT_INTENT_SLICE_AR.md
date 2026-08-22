# Payment Intent — Consultation Slice

## الحكم

**الحالة: BFF Payment Intent منفذ ومختبر؛ checkout UI/إكمال الدفع الخارجي محجوب حتى يثبت عقد client-facing للـPSP.**

## العقد الحي

تم التحقق من وجود المسار في OpenAPI المرجعي:

`POST /api/v1/payments/intent/{type}/{id}`

وتثبت نسخة backend المتاحة أن controller يضيف `IdempotencyInterceptor`، وأن نوع consultation يستخدم booking owner check ويمنع إنشاء intent جديد لحجز مدفوع، ويعيد transaction record من خدمة الدفع. كما يثبت العقد وجود `POST /api/v1/payments/verify/{txn}`، لكن OpenAPI الحالي لا يعرّف response schema أو public checkout method لهذا المسار.

## ما تم تنفيذه

أُضيف `POST /api/appointments/[appointmentId]/payment-intent` في BFF. يتحقق من UUID، access cookie الخادمية، و`Idempotency-Key`، ثم يستدعي `/payments/intent/consultation/{appointmentId}`. الاستجابة تُختزل إلى `transactionId`, `status`, `amount`, `currency`, وcheckout URL إذا كان URL عاماً صالحاً؛ يتم حذف `client_secret`, `gateway_intent_id`, patient fields، وPSP raw fields.

لا تُرسل بيانات البطاقة أو CVV أو أي payment credential من الويب إلى BFF. لا توجد client-side totals؛ المبلغ مصدره backend/booking. حالات 401 و404 و409 و502 لا تنشئ نجاحاً محلياً.

## قرار واجهة الدفع

لم أضف زر checkout يفتح رابط PSP أو يعرض `client_secret`، لأن العقد المنشور لا يثبت schema آمنة للعميل ولا provider SDK/redirect contract. إضافة ذلك الآن قد تضع secret أو token في URL، أو تفتح PSP intent غير قابل للإكمال. لذلك endpoint جاهز خلف integration point، والواجهة تبقى **محجوبة بانتظار عقد checkout client-facing**. عند نشر schema تتضمن public checkout session/URL أو SDK-safe client credential، تُضاف واجهة الدفع دون تغيير BFF ownership/idempotency.

## الاختبارات والبوابات

| البوابة | النتيجة |
|---|---|
| Payment Intent BFF tests | **1 file / 4 tests ناجحة** |
| Full Vitest قبل cleanup النهائي | **124 files ناجحة، 14 متجاوزة؛ 237 tests ناجحة، 23 متجاوزة** |
| Type-check | ناجح |
| Production build | ناجح؛ ظهر `/api/appointments/[appointmentId]/payment-intent` |
| Live payment mutation | غير مشغل؛ لا توجد `NABD_SANDBOX_*` معتمدة، ولم تُرسل بيانات دفع إلى الإنتاج |

## الحدود المطلوبة للإكمال

يلزم عقد منشور يحدد response schema للـintent، طريقة checkout الآمنة للعميل، verify/return state، webhook-to-booking transition، وsandbox test account/payment fixture. بعد ذلك فقط يمكن تشغيل `pnpm test:sandbox` وإضافة owner/stranger/unauth/replay وgateway-failure live evidence.
