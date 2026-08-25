# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE6_AUTH_OTP_BRIDGING_BLOCKED_AR.md`
- **Member SHA-256:** `4ce854c6e21501bee5fb0186b2ba18b039a3934acd0d57cba0177f25049363c3`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: الويب الحالي يستخدم server routes لـpassword login و2FA، ويضع access/refresh tokens في httpOnly cookies عبر BFF. لم يتم إضافة OTP browser flow لأنه لا يوجد في OpenAPI المنشور `POST /auth/session/exchange` ولا يظهر في repository أي `exchange`
- `11: يجب إضافة وتوثيق `POST /auth/session/exchange` في backend/OpenAPI، مع one-time exchange token وTTL 60 ثانية، واستجابة `{ authenticated: true }` فقط، وSet-Cookie server-side. ثم تُضاف اختبارات unauth/invalid/expired/consumed وSSR login flow `
### backend_consumers_or_contracts
- `5: الويب الحالي يستخدم server routes لـpassword login و2FA، ويضع access/refresh tokens في httpOnly cookies عبر BFF. لم يتم إضافة OTP browser flow لأنه لا يوجد في OpenAPI المنشور `POST /auth/session/exchange` ولا يظهر في repository أي `exchange`
- `7: OpenAPI الحالي يسجل `POST /auth/send-otp` و`POST /auth/verify-otp`، لكن Contract Pack يطلب أن يعيد verify رمز exchange قصير العمر ثم تستقبله endpoint session exchange التي تنشئ cookies ولا تعيد tokens في body. تنفيذ send/verify مباشرة في ال`
- `11: يجب إضافة وتوثيق `POST /auth/session/exchange` في backend/OpenAPI، مع one-time exchange token وTTL 60 ثانية، واستجابة `{ authenticated: true }` فقط، وSet-Cookie server-side. ثم تُضاف اختبارات unauth/invalid/expired/consumed وSSR login flow `
### auth_ownership
- `1: # Auth/OTP Contract Pack — Web bridge gate`
- `5: الويب الحالي يستخدم server routes لـpassword login و2FA، ويضع access/refresh tokens في httpOnly cookies عبر BFF. لم يتم إضافة OTP browser flow لأنه لا يوجد في OpenAPI المنشور `POST /auth/session/exchange` ولا يظهر في repository أي `exchange`
- `7: OpenAPI الحالي يسجل `POST /auth/send-otp` و`POST /auth/verify-otp`، لكن Contract Pack يطلب أن يعيد verify رمز exchange قصير العمر ثم تستقبله endpoint session exchange التي تنشئ cookies ولا تعيد tokens في body. تنفيذ send/verify مباشرة في ال`
- `11: يجب إضافة وتوثيق `POST /auth/session/exchange` في backend/OpenAPI، مع one-time exchange token وTTL 60 ثانية، واستجابة `{ authenticated: true }` فقط، وSet-Cookie server-side. ثم تُضاف اختبارات unauth/invalid/expired/consumed وSSR login flow `
- `13: الحالة: **Blocked by missing backend web session exchange contract**، وليس mock أو partial implementation.`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
