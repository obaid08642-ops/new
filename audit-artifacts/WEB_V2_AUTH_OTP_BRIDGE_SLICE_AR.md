# Auth/OTP Bridge — Contract Slice

## الحكم

**الحالة: منفذة محلياً ومختبرة، جاهزة للدفع؛ live OTP account flow غير مشغّل لغياب `NABD_SANDBOX_*` المعتمدة.** تم التحقق من وصول base API الحي عبر `https://api.nabd.plus/api/v1`، وكانت الاستجابة `status: ok` و`version: 1.0.0`. لم تُرسل أي بيانات شخصية أو OTP إلى الإنتاج أثناء التدقيق.

## العقد المنفذ

| العملية | BFF Web route | upstream route | السلوك |
|---|---|---|---|
| طلب الرمز | `POST /api/auth/otp/request` | `POST /auth/otp/request` | يتحقق من identifier ويرجع payload/error upstream دون token |
| تحقق الرمز | `POST /api/auth/otp/verify` | `POST /auth/otp/verify` | يقبل `identifier` و6 أرقام، ويعيد فقط `{ok, expires_in}`؛ exchange token يبقى داخل cookie HttpOnly |
| إنشاء الجلسة | `POST /api/auth/session/exchange` | `POST /auth/session/exchange` | يمرر `nabd_otp_exchange` وحدها، ويرجع `{authenticated:true}` فقط |

## الأمان

تم منع exchange token من body وURL. لا يُمرر إلى upstream إلا cookie `nabd_otp_exchange`، ولا تُمرر cookies أخرى من browser request. تم تحويل cookie path من `/api/v1/auth/session/exchange` إلى مسار BFF `/api/auth/session/exchange` حتى تعمل الدورة كاملة من خلال web origin. Cookies الجلسة التي يعيدها upstream تبقى خادمية عبر `httpOnly` و`secure` في الإنتاج و`SameSite=Strict` بحسب العقد المنشور.

LoginForm أصبح يدعم خياراً اختيارياً لاستخدام OTP: request ثم verify ثم exchange، مع بقاء password و2FA الحاليين. الرمز لا يُحفظ في localStorage أو URL ولا يظهر في redirect. لا يوجد fallback session عند الفشل.

## الاختبارات

| البوابة | النتيجة |
|---|---|
| OTP route contract tests | **1 file / 4 tests ناجحة** |
| Login component/design tests | 2 files / 4 tests ناجحة |
| Targeted OTP/Login | 3 files / 8 tests ناجحة |
| Full Vitest النهائي | **122 files ناجحة، 14 متجاوزة؛ 229 tests ناجحة، 23 متجاوزة** |
| Type-check | ناجح |
| Production build | ناجح، ويظهر `/api/auth/otp/request` و`/api/auth/otp/verify` و`/api/auth/session/exchange` |
| Live base health | ناجح؛ API root أعاد `status: ok` |
| Live OTP account flow | غير مشغّل؛ لا توجد حسابات Sandbox معتمدة في البيئة |

## الحدود

لا يمكن إثبات إرسال SMS/email أو استهلاك OTP مرة واحدة أو TTL 60 ثانية من دون حساب اختبار معتمد ورمز يصل إلى قناة الاختبار. لا يجوز استخدام حسابات حقيقية أو تخمين OTP. عند وصول `NABD_SANDBOX_*` سيتم تشغيل `pnpm test:sandbox` وتسجيل النتائج الفعلية، ثم إضافة اختبار live للـrequest/verify/exchange وreplay/expiry.

## مراجع محلية

- `/home/ubuntu/nabdah_backend_work/src/modules/auth/auth.controller.ts`: DTOs ومسارات OTP وcookie contract.
- `/home/ubuntu/nabdah_impl/repo/audit-artifacts/live-api-baseline-20260822.md`: نتيجة الوصول إلى API root الحي.
- `/home/ubuntu/nabdah_impl/repo/app/api/auth/otp/otp-routes.test.ts`: اختبارات BFF الأمنية.
