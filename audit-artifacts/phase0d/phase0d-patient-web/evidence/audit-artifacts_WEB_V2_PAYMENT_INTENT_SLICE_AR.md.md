# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_PAYMENT_INTENT_SLICE_AR.md`
- **Member SHA-256:** `00ccdb394d123dadd3970ba1d1b2f2f68c626d17c7adb51ed15fcc09e5a5b57b`
- **Line count:** 37
- **Read range:** `1-37`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: **الحالة: BFF Payment Intent منفذ ومختبر؛ checkout UI/إكمال الدفع الخارجي محجوب حتى يثبت عقد client-facing للـPSP.**`
- `13: وتثبت نسخة backend المتاحة أن controller يضيف `IdempotencyInterceptor`، وأن نوع consultation يستخدم booking owner check ويمنع إنشاء intent جديد لحجز مدفوع، ويعيد transaction record من خدمة الدفع. كما يثبت العقد وجود `POST /api/v1/payments/v`
- `17: أُضيف `POST /api/appointments/[appointmentId]/payment-intent` في BFF. يتحقق من UUID، access cookie الخادمية، و`Idempotency-Key`، ثم يستدعي `/payments/intent/consultation/{appointmentId}`. الاستجابة تُختزل إلى `transactionId`, `status`, `amo`
- `19: لا تُرسل بيانات البطاقة أو CVV أو أي payment credential من الويب إلى BFF. لا توجد client-side totals؛ المبلغ مصدره backend/booking. حالات 401 و404 و409 و502 لا تنشئ نجاحاً محلياً.`
- `23: لم أضف زر checkout يفتح رابط PSP أو يعرض `client_secret`، لأن العقد المنشور لا يثبت schema آمنة للعميل ولا provider SDK/redirect contract. إضافة ذلك الآن قد تضع secret أو token في URL، أو تفتح PSP intent غير قابل للإكمال. لذلك endpoint جاهز`
- `37: يلزم عقد منشور يحدد response schema للـintent، طريقة checkout الآمنة للعميل، verify/return state، webhook-to-booking transition، وsandbox test account/payment fixture. بعد ذلك فقط يمكن تشغيل `pnpm test:sandbox` وإضافة owner/stranger/unauth/`
### backend_consumers_or_contracts
- `11: `POST /api/v1/payments/intent/{type}/{id}``
- `13: وتثبت نسخة backend المتاحة أن controller يضيف `IdempotencyInterceptor`، وأن نوع consultation يستخدم booking owner check ويمنع إنشاء intent جديد لحجز مدفوع، ويعيد transaction record من خدمة الدفع. كما يثبت العقد وجود `POST /api/v1/payments/v`
- `17: أُضيف `POST /api/appointments/[appointmentId]/payment-intent` في BFF. يتحقق من UUID، access cookie الخادمية، و`Idempotency-Key`، ثم يستدعي `/payments/intent/consultation/{appointmentId}`. الاستجابة تُختزل إلى `transactionId`, `status`, `amo`
- `32: | Production build | ناجح؛ ظهر `/api/appointments/[appointmentId]/payment-intent` |`
### auth_ownership
- `13: وتثبت نسخة backend المتاحة أن controller يضيف `IdempotencyInterceptor`، وأن نوع consultation يستخدم booking owner check ويمنع إنشاء intent جديد لحجز مدفوع، ويعيد transaction record من خدمة الدفع. كما يثبت العقد وجود `POST /api/v1/payments/v`
- `17: أُضيف `POST /api/appointments/[appointmentId]/payment-intent` في BFF. يتحقق من UUID، access cookie الخادمية، و`Idempotency-Key`، ثم يستدعي `/payments/intent/consultation/{appointmentId}`. الاستجابة تُختزل إلى `transactionId`, `status`, `amo`
- `23: لم أضف زر checkout يفتح رابط PSP أو يعرض `client_secret`، لأن العقد المنشور لا يثبت schema آمنة للعميل ولا provider SDK/redirect contract. إضافة ذلك الآن قد تضع secret أو token في URL، أو تفتح PSP intent غير قابل للإكمال. لذلك endpoint جاهز`
- `37: يلزم عقد منشور يحدد response schema للـintent، طريقة checkout الآمنة للعميل، verify/return state، webhook-to-booking transition، وsandbox test account/payment fixture. بعد ذلك فقط يمكن تشغيل `pnpm test:sandbox` وإضافة owner/stranger/unauth/`
### state_transitions
- `17: أُضيف `POST /api/appointments/[appointmentId]/payment-intent` في BFF. يتحقق من UUID، access cookie الخادمية، و`Idempotency-Key`، ثم يستدعي `/payments/intent/consultation/{appointmentId}`. الاستجابة تُختزل إلى `transactionId`, `status`, `amo`
- `37: يلزم عقد منشور يحدد response schema للـintent، طريقة checkout الآمنة للعميل، verify/return state، webhook-to-booking transition، وsandbox test account/payment fixture. بعد ذلك فقط يمكن تشغيل `pnpm test:sandbox` وإضافة owner/stranger/unauth/`
### payment_insurance_relevance
- `1: # Payment Intent — Consultation Slice`
- `5: **الحالة: BFF Payment Intent منفذ ومختبر؛ checkout UI/إكمال الدفع الخارجي محجوب حتى يثبت عقد client-facing للـPSP.**`
- `11: `POST /api/v1/payments/intent/{type}/{id}``
- `13: وتثبت نسخة backend المتاحة أن controller يضيف `IdempotencyInterceptor`، وأن نوع consultation يستخدم booking owner check ويمنع إنشاء intent جديد لحجز مدفوع، ويعيد transaction record من خدمة الدفع. كما يثبت العقد وجود `POST /api/v1/payments/v`
- `17: أُضيف `POST /api/appointments/[appointmentId]/payment-intent` في BFF. يتحقق من UUID، access cookie الخادمية، و`Idempotency-Key`، ثم يستدعي `/payments/intent/consultation/{appointmentId}`. الاستجابة تُختزل إلى `transactionId`, `status`, `amo`
- `19: لا تُرسل بيانات البطاقة أو CVV أو أي payment credential من الويب إلى BFF. لا توجد client-side totals؛ المبلغ مصدره backend/booking. حالات 401 و404 و409 و502 لا تنشئ نجاحاً محلياً.`
- `29: | Payment Intent BFF tests | **1 file / 4 tests ناجحة** |`
- `32: | Production build | ناجح؛ ظهر `/api/appointments/[appointmentId]/payment-intent` |`
- `33: | Live payment mutation | غير مشغل؛ لا توجد `NABD_SANDBOX_*` معتمدة، ولم تُرسل بيانات دفع إلى الإنتاج |`
- `37: يلزم عقد منشور يحدد response schema للـintent، طريقة checkout الآمنة للعميل، verify/return state، webhook-to-booking transition، وsandbox test account/payment fixture. بعد ذلك فقط يمكن تشغيل `pnpm test:sandbox` وإضافة owner/stranger/unauth/`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
