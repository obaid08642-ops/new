# Consultation Call-token — Contract Slice

## الحكم

**منفذة ومختبرة محلياً ومهيأة للدفع؛ لم يُطلب token حقيقي من موعد إنتاج أو Sandbox.**

تمت مطابقة عقد `GET /api/v1/unified-bookings/{id}/call-token`. backend يعلن استجابة `provider`, `token`, `room` ويستدعي LiveKit appointment token service مع owner/user id. نافذة الصلاحية ووقت الموعد يقررهما backend؛ الويب لا يمدد التوكن ولا يخزن credential.

## التنفيذ

أُضيف BFF إلى `GET /api/appointments/[appointmentId]/call-token`. يتحقق من UUID والجلسة الخادمية، يمرر access cookie إلى upstream فقط، يفرض no-store، ويقبل الاستجابة إذا كانت LiveKit credential صحيحة. لا يظهر token في SSR HTML أو URL أو localStorage أو logs. token موجود فقط في استجابة fetch وفي state الذاكرة المؤقتة للمكوّن لأن عميل LiveKit يحتاجه للاتصال.

أُضيف `CallTokenLauncher` إلى appointment detail للمواعيد `video` النشطة فقط. يطلب credential عند تفاعل المستخدم، ويعرض حالات loading/error/ready، ويمسح credential من الذاكرة عند discard. الواجهة الحالية تجهز credential ولا تدّعي إنشاء اتصال فيديو؛ SDK/WebRTC client غير موجود في dependencies الحالية، لذلك لا يوجد زر نجاح مصطنع أو رابط غرفة مخترع.

## الاختبارات والبوابات

| Gate | Result |
|---|---|
| Call-token BFF tests | 1 file / 3 tests passed |
| Appointment SSR regression | 1 file / 3 tests passed |
| Full Vitest | **130 files passed، 14 skipped؛ 251 tests passed، 23 skipped** |
| Type-check | passed |
| Production build | passed؛ ظهر `/api/appointments/[appointmentId]/call-token` |
| Live owner/stranger/expiry | غير مشغل؛ `NABD_SANDBOX_*` غير متاحة |

## الحدود والخطوة التالية

لا يمكن إثبات owner/stranger ونافذة العشر دقائق وTTL live دون موعد Sandbox معتمد. كما أن الانضمام الفعلي إلى غرفة LiveKit يحتاج عقد/اعتماد SDK client واضحاً؛ هذه الشريحة لا تخترع ذلك. بعد توفر Sandbox وقرار SDK، يمكن إضافة `@livekit/components-react` أو عميل معتمد في شريحة منفصلة، مع إبقاء credential في الذاكرة فقط.
