# Auth/OTP Contract Pack — Web bridge gate

## النتيجة

الويب الحالي يستخدم server routes لـpassword login و2FA، ويضع access/refresh tokens في httpOnly cookies عبر BFF. لم يتم إضافة OTP browser flow لأنه لا يوجد في OpenAPI المنشور `POST /auth/session/exchange` ولا يظهر في repository أي `exchange_token` أو bridge equivalent.

OpenAPI الحالي يسجل `POST /auth/send-otp` و`POST /auth/verify-otp`، لكن Contract Pack يطلب أن يعيد verify رمز exchange قصير العمر ثم تستقبله endpoint session exchange التي تنشئ cookies ولا تعيد tokens في body. تنفيذ send/verify مباشرة في المتصفح أو تمرير response token إلى client سيكسر قاعدة الأمان الأساسية.

## المطلوب قبل التنفيذ

يجب إضافة وتوثيق `POST /auth/session/exchange` في backend/OpenAPI، مع one-time exchange token وTTL 60 ثانية، واستجابة `{ authenticated: true }` فقط، وSet-Cookie server-side. ثم تُضاف اختبارات unauth/invalid/expired/consumed وSSR login flow قبل إدخال UI OTP.

الحالة: **Blocked by missing backend web session exchange contract**، وليس mock أو partial implementation.
