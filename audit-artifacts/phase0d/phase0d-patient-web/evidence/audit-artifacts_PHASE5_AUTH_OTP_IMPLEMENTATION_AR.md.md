# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE5_AUTH_OTP_IMPLEMENTATION_AR.md`
- **Member SHA-256:** `21fab17c4164a8763a14a6ba65d311876569091053e7d4bba1c08ff143f1406c`
- **Line count:** 21
- **Read range:** `1-21`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: تم فحص OpenAPI ومصدر Backend. Login Web كان يستدعي `POST /auth/login` عبر BFF ويخزن token pair في httpOnly cookies. Backend يعيد `requires_2fa` عند الحاجة ويملك `POST /auth/login/verify-2fa`.`
- `7: تم بناء BFF route `/api/auth/verify-2fa` بــZod validation لـidentifier/code، واستدعاء server-side للعقد الحقيقي، ثم حفظ access/refresh/device في نفس httpOnly cookies. لا يعاد token أو code إلى HTML أو browser storage.`
- `9: تم تحديث LoginForm ليعرض حالة 2FA حقيقية بعد `requires_2fa`، يعطل identifier، يطلب `one-time-code`، ويعيد المستخدم إلى Dashboard فقط بعد نجاح verify. رسائل 2FA مترجمة في اللغات الست، ولم يعد النص يدعي أن النموذج غير مفعّل.`
- `13: نجحت LoginForm tests، full Vitest: 59 test files passed و14 skipped، 107 tests passed و23 skipped، truthful runtime gate على 183 production files، TypeScript check، production build، وdiff check.`
- `17: `send-otp`, `verify-otp`, `reset-password`, registration/guest conversion، social login، passkey enrollment/login/removal، trusted devices، logout-all، heartbeat، consent، وlive session management لم تُبنَ كواجهات Web. وجودها في Backend لا `
- `21: لا يتم تنفيذ OTP reset أو passkey أو social login بواجهات شكلية. 2FA login فقط أُغلق لأن Backend controller/service يثبت endpoint وflow واضحين، بينما بقية العمليات تبقى deferred حتى تثبت عقودها واختبارات 75/417 وreplay/lockout في Sandbox.`
### backend_consumers_or_contracts
- `5: تم فحص OpenAPI ومصدر Backend. Login Web كان يستدعي `POST /auth/login` عبر BFF ويخزن token pair في httpOnly cookies. Backend يعيد `requires_2fa` عند الحاجة ويملك `POST /auth/login/verify-2fa`.`
- `7: تم بناء BFF route `/api/auth/verify-2fa` بــZod validation لـidentifier/code، واستدعاء server-side للعقد الحقيقي، ثم حفظ access/refresh/device في نفس httpOnly cookies. لا يعاد token أو code إلى HTML أو browser storage.`
### auth_ownership
- `1: # Phase 5 — Auth/OTP Contract Pack`
- `5: تم فحص OpenAPI ومصدر Backend. Login Web كان يستدعي `POST /auth/login` عبر BFF ويخزن token pair في httpOnly cookies. Backend يعيد `requires_2fa` عند الحاجة ويملك `POST /auth/login/verify-2fa`.`
- `7: تم بناء BFF route `/api/auth/verify-2fa` بــZod validation لـidentifier/code، واستدعاء server-side للعقد الحقيقي، ثم حفظ access/refresh/device في نفس httpOnly cookies. لا يعاد token أو code إلى HTML أو browser storage.`
- `9: تم تحديث LoginForm ليعرض حالة 2FA حقيقية بعد `requires_2fa`، يعطل identifier، يطلب `one-time-code`، ويعيد المستخدم إلى Dashboard فقط بعد نجاح verify. رسائل 2FA مترجمة في اللغات الست، ولم يعد النص يدعي أن النموذج غير مفعّل.`
- `13: نجحت LoginForm tests، full Vitest: 59 test files passed و14 skipped، 107 tests passed و23 skipped، truthful runtime gate على 183 production files، TypeScript check، production build، وdiff check.`
- `15: ## ما بقي في Auth/OTP`
- `17: `send-otp`, `verify-otp`, `reset-password`, registration/guest conversion، social login، passkey enrollment/login/removal، trusted devices، logout-all، heartbeat، consent، وlive session management لم تُبنَ كواجهات Web. وجودها في Backend لا `
- `21: لا يتم تنفيذ OTP reset أو passkey أو social login بواجهات شكلية. 2FA login فقط أُغلق لأن Backend controller/service يثبت endpoint وflow واضحين، بينما بقية العمليات تبقى deferred حتى تثبت عقودها واختبارات 75/417 وreplay/lockout في Sandbox.`
### state_transitions
- `17: `send-otp`, `verify-otp`, `reset-password`, registration/guest conversion، social login، passkey enrollment/login/removal، trusted devices، logout-all، heartbeat، consent، وlive session management لم تُبنَ كواجهات Web. وجودها في Backend لا `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `17: `send-otp`, `verify-otp`, `reset-password`, registration/guest conversion، social login، passkey enrollment/login/removal، trusted devices، logout-all، heartbeat، consent، وlive session management لم تُبنَ كواجهات Web. وجودها في Backend لا `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
