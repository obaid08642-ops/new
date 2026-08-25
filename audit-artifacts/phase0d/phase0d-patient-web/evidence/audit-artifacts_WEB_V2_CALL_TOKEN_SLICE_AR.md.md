# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_CALL_TOKEN_SLICE_AR.md`
- **Member SHA-256:** `815d9196a2089b758798aaeb1fa50dbf6edfe886167e11568431bba6fae00416`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: تمت مطابقة عقد `GET /api/v1/unified-bookings/{id}/call-token`. backend يعلن استجابة `provider`, `token`, `room` ويستدعي LiveKit appointment token service مع owner/user id. نافذة الصلاحية ووقت الموعد يقررهما backend؛ الويب لا يمدد التوكن ولا`
### backend_consumers_or_contracts
- `7: تمت مطابقة عقد `GET /api/v1/unified-bookings/{id}/call-token`. backend يعلن استجابة `provider`, `token`, `room` ويستدعي LiveKit appointment token service مع owner/user id. نافذة الصلاحية ووقت الموعد يقررهما backend؛ الويب لا يمدد التوكن ولا`
- `11: أُضيف BFF إلى `GET /api/appointments/[appointmentId]/call-token`. يتحقق من UUID والجلسة الخادمية، يمرر access cookie إلى upstream فقط، يفرض no-store، ويقبل الاستجابة إذا كانت LiveKit credential صحيحة. لا يظهر token في SSR HTML أو URL أو loc`
- `23: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/call-token` |`
### auth_ownership
- `1: # Consultation Call-token — Contract Slice`
- `5: **منفذة ومختبرة محلياً ومهيأة للدفع؛ لم يُطلب token حقيقي من موعد إنتاج أو Sandbox.**`
- `7: تمت مطابقة عقد `GET /api/v1/unified-bookings/{id}/call-token`. backend يعلن استجابة `provider`, `token`, `room` ويستدعي LiveKit appointment token service مع owner/user id. نافذة الصلاحية ووقت الموعد يقررهما backend؛ الويب لا يمدد التوكن ولا`
- `11: أُضيف BFF إلى `GET /api/appointments/[appointmentId]/call-token`. يتحقق من UUID والجلسة الخادمية، يمرر access cookie إلى upstream فقط، يفرض no-store، ويقبل الاستجابة إذا كانت LiveKit credential صحيحة. لا يظهر token في SSR HTML أو URL أو loc`
- `13: أُضيف `CallTokenLauncher` إلى appointment detail للمواعيد `video` النشطة فقط. يطلب credential عند تفاعل المستخدم، ويعرض حالات loading/error/ready، ويمسح credential من الذاكرة عند discard. الواجهة الحالية تجهز credential ولا تدّعي إنشاء اتصا`
- `19: | Call-token BFF tests | 1 file / 3 tests passed |`
- `23: | Production build | passed؛ ظهر `/api/appointments/[appointmentId]/call-token` |`
- `24: | Live owner/stranger/expiry | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |`
- `28: لا يمكن إثبات owner/stranger ونافذة العشر دقائق وTTL live دون موعد Sandbox معتمد. كما أن الانضمام الفعلي إلى غرفة LiveKit يحتاج عقد/اعتماد SDK client واضحاً؛ هذه الشريحة لا تخترع ذلك. بعد توفر Sandbox وقرار SDK، يمكن إضافة `@livekit/compone`
### state_transitions
- `11: أُضيف BFF إلى `GET /api/appointments/[appointmentId]/call-token`. يتحقق من UUID والجلسة الخادمية، يمرر access cookie إلى upstream فقط، يفرض no-store، ويقبل الاستجابة إذا كانت LiveKit credential صحيحة. لا يظهر token في SSR HTML أو URL أو loc`
- `13: أُضيف `CallTokenLauncher` إلى appointment detail للمواعيد `video` النشطة فقط. يطلب credential عند تفاعل المستخدم، ويعرض حالات loading/error/ready، ويمسح credential من الذاكرة عند discard. الواجهة الحالية تجهز credential ولا تدّعي إنشاء اتصا`
### payment_insurance_relevance
- `13: أُضيف `CallTokenLauncher` إلى appointment detail للمواعيد `video` النشطة فقط. يطلب credential عند تفاعل المستخدم، ويعرض حالات loading/error/ready، ويمسح credential من الذاكرة عند discard. الواجهة الحالية تجهز credential ولا تدّعي إنشاء اتصا`
### error_empty_loading_retry_cancel
- `13: أُضيف `CallTokenLauncher` إلى appointment detail للمواعيد `video` النشطة فقط. يطلب credential عند تفاعل المستخدم، ويعرض حالات loading/error/ready، ويمسح credential من الذاكرة عند discard. الواجهة الحالية تجهز credential ولا تدّعي إنشاء اتصا`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
