# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/WEB_V2_AUTH_OTP_BRIDGE_SLICE_AR.md`
- **Member SHA-256:** `a50ccbf00be82949a967731fa4a09bd1856dd147ad4605397581ab390393a318`
- **Line count:** 42
- **Read range:** `1-42`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: | العملية | BFF Web route | upstream route | السلوك |`
- `19: LoginForm أصبح يدعم خياراً اختيارياً لاستخدام OTP: request ثم verify ثم exchange، مع بقاء password و2FA الحاليين. الرمز لا يُحفظ في localStorage أو URL ولا يظهر في redirect. لا يوجد fallback session عند الفشل.`
- `25: | OTP route contract tests | **1 file / 4 tests ناجحة** |`
- `26: | Login component/design tests | 2 files / 4 tests ناجحة |`
- `27: | Targeted OTP/Login | 3 files / 8 tests ناجحة |`
- `42: - `/home/ubuntu/nabdah_impl/repo/app/api/auth/otp/otp-routes.test.ts`: اختبارات BFF الأمنية.`
### backend_consumers_or_contracts
- `5: **الحالة: منفذة محلياً ومختبرة، جاهزة للدفع؛ live OTP account flow غير مشغّل لغياب `NABD_SANDBOX_*` المعتمدة.** تم التحقق من وصول base API الحي عبر `https://api.nabd.plus/api/v1`، وكانت الاستجابة `status: ok` و`version: 1.0.0`. لم تُرسل أي `
- `11: | طلب الرمز | `POST /api/auth/otp/request` | `POST /auth/otp/request` | يتحقق من identifier ويرجع payload/error upstream دون token |`
- `12: | تحقق الرمز | `POST /api/auth/otp/verify` | `POST /auth/otp/verify` | يقبل `identifier` و6 أرقام، ويعيد فقط `{ok, expires_in}`؛ exchange token يبقى داخل cookie HttpOnly |`
- `13: | إنشاء الجلسة | `POST /api/auth/session/exchange` | `POST /auth/session/exchange` | يمرر `nabd_otp_exchange` وحدها، ويرجع `{authenticated:true}` فقط |`
- `17: تم منع exchange token من body وURL. لا يُمرر إلى upstream إلا cookie `nabd_otp_exchange`، ولا تُمرر cookies أخرى من browser request. تم تحويل cookie path من `/api/v1/auth/session/exchange` إلى مسار BFF `/api/auth/session/exchange` حتى تعمل `
- `30: | Production build | ناجح، ويظهر `/api/auth/otp/request` و`/api/auth/otp/verify` و`/api/auth/session/exchange` |`
- `40: - `/home/ubuntu/nabdah_backend_work/src/modules/auth/auth.controller.ts`: DTOs ومسارات OTP وcookie contract.`
- `42: - `/home/ubuntu/nabdah_impl/repo/app/api/auth/otp/otp-routes.test.ts`: اختبارات BFF الأمنية.`
### auth_ownership
- `1: # Auth/OTP Bridge — Contract Slice`
- `5: **الحالة: منفذة محلياً ومختبرة، جاهزة للدفع؛ live OTP account flow غير مشغّل لغياب `NABD_SANDBOX_*` المعتمدة.** تم التحقق من وصول base API الحي عبر `https://api.nabd.plus/api/v1`، وكانت الاستجابة `status: ok` و`version: 1.0.0`. لم تُرسل أي `
- `11: | طلب الرمز | `POST /api/auth/otp/request` | `POST /auth/otp/request` | يتحقق من identifier ويرجع payload/error upstream دون token |`
- `12: | تحقق الرمز | `POST /api/auth/otp/verify` | `POST /auth/otp/verify` | يقبل `identifier` و6 أرقام، ويعيد فقط `{ok, expires_in}`؛ exchange token يبقى داخل cookie HttpOnly |`
- `13: | إنشاء الجلسة | `POST /api/auth/session/exchange` | `POST /auth/session/exchange` | يمرر `nabd_otp_exchange` وحدها، ويرجع `{authenticated:true}` فقط |`
- `17: تم منع exchange token من body وURL. لا يُمرر إلى upstream إلا cookie `nabd_otp_exchange`، ولا تُمرر cookies أخرى من browser request. تم تحويل cookie path من `/api/v1/auth/session/exchange` إلى مسار BFF `/api/auth/session/exchange` حتى تعمل `
- `19: LoginForm أصبح يدعم خياراً اختيارياً لاستخدام OTP: request ثم verify ثم exchange، مع بقاء password و2FA الحاليين. الرمز لا يُحفظ في localStorage أو URL ولا يظهر في redirect. لا يوجد fallback session عند الفشل.`
- `25: | OTP route contract tests | **1 file / 4 tests ناجحة** |`
- `26: | Login component/design tests | 2 files / 4 tests ناجحة |`
- `27: | Targeted OTP/Login | 3 files / 8 tests ناجحة |`
- `30: | Production build | ناجح، ويظهر `/api/auth/otp/request` و`/api/auth/otp/verify` و`/api/auth/session/exchange` |`
- `32: | Live OTP account flow | غير مشغّل؛ لا توجد حسابات Sandbox معتمدة في البيئة |`
### state_transitions
- `5: **الحالة: منفذة محلياً ومختبرة، جاهزة للدفع؛ live OTP account flow غير مشغّل لغياب `NABD_SANDBOX_*` المعتمدة.** تم التحقق من وصول base API الحي عبر `https://api.nabd.plus/api/v1`، وكانت الاستجابة `status: ok` و`version: 1.0.0`. لم تُرسل أي `
- `11: | طلب الرمز | `POST /api/auth/otp/request` | `POST /auth/otp/request` | يتحقق من identifier ويرجع payload/error upstream دون token |`
- `31: | Live base health | ناجح؛ API root أعاد `status: ok` |`
### payment_insurance_relevance
- `11: | طلب الرمز | `POST /api/auth/otp/request` | `POST /auth/otp/request` | يتحقق من identifier ويرجع payload/error upstream دون token |`
### error_empty_loading_retry_cancel
- `11: | طلب الرمز | `POST /api/auth/otp/request` | `POST /auth/otp/request` | يتحقق من identifier ويرجع payload/error upstream دون token |`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
