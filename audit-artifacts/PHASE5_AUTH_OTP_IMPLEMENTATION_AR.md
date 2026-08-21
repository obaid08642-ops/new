# Phase 5 — Auth/OTP Contract Pack

## ما تم تنفيذه

تم فحص OpenAPI ومصدر Backend. Login Web كان يستدعي `POST /auth/login` عبر BFF ويخزن token pair في httpOnly cookies. Backend يعيد `requires_2fa` عند الحاجة ويملك `POST /auth/login/verify-2fa`.

تم بناء BFF route `/api/auth/verify-2fa` بــZod validation لـidentifier/code، واستدعاء server-side للعقد الحقيقي، ثم حفظ access/refresh/device في نفس httpOnly cookies. لا يعاد token أو code إلى HTML أو browser storage.

تم تحديث LoginForm ليعرض حالة 2FA حقيقية بعد `requires_2fa`، يعطل identifier، يطلب `one-time-code`، ويعيد المستخدم إلى Dashboard فقط بعد نجاح verify. رسائل 2FA مترجمة في اللغات الست، ولم يعد النص يدعي أن النموذج غير مفعّل.

## الاختبارات

نجحت LoginForm tests، full Vitest: 59 test files passed و14 skipped، 107 tests passed و23 skipped، truthful runtime gate على 183 production files، TypeScript check، production build، وdiff check.

## ما بقي في Auth/OTP

`send-otp`, `verify-otp`, `reset-password`, registration/guest conversion، social login، passkey enrollment/login/removal، trusted devices، logout-all، heartbeat، consent، وlive session management لم تُبنَ كواجهات Web. وجودها في Backend لا يكفي؛ يلزم request/response DTO، cookie/session semantics، rate-limit/error contracts، recovery UX، owner tests، وsecurity review لكل عملية.

## قرار الأمان

لا يتم تنفيذ OTP reset أو passkey أو social login بواجهات شكلية. 2FA login فقط أُغلق لأن Backend controller/service يثبت endpoint وflow واضحين، بينما بقية العمليات تبقى deferred حتى تثبت عقودها واختبارات 75/417 وreplay/lockout في Sandbox.
