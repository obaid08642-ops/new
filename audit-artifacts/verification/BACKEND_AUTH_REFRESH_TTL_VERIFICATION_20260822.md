# تحقق دفعة عمر Refresh Session — 2026-08-22

**النطاق المحلي فقط:** عُدّل `AuthService.signToken` بحيث يوقع refresh JWT لمدة **14 يوماً** ويحفظ سجل `refresh:<jti>` في Redis لمدة **14 يوماً**. يظل access token لمدة ساعة. يطابق ذلك عقد `/auth/session/exchange` الذي يحدد access لمدة ساعة وrefresh لمدة 14 يوماً. لم يُنفذ في هذه الدفعة إقلاع `node dist/main.js`، ولم تُجرَ اختبارات Sandbox أو إنتاج.

| التغيير | المسار | تحقق الانحدار |
|---|---|---|
| `expiresIn` للـrefresh JWT صار `14d` | `src/modules/auth/auth.service.ts` | اختبار contract يتحقق من وسيطة JwtService الثانية. |
| TTL لـRedis refresh session صار `14 * 24 * 3600` | `src/modules/auth/auth.service.ts` | الاختبار نفسه يتحقق من `SET ... EX 1209600`. |
| حماية من تراجع TTL | `src/modules/auth/patient-web-auth.contract.spec.ts` | `issues a 14-day refresh token and keeps Redis session TTL aligned`. |

| البوابة المحلية | النتيجة | ملف النص الكامل | SHA-256 |
|---|---|---|---|
| `npm run build` | ناجح | `BACKEND_AUTH_REFRESH_TTL_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | 78 suites / 426 tests ناجحة | `BACKEND_AUTH_REFRESH_TTL_FULL_TEST_20260822.txt` | `c17d4f93bc0ec9c81825eeed29be266630267240b553b79ee4a0c585748dad34` |
| `npm run test:boot` | 1 suite / 1 test ناجحة | `BACKEND_AUTH_REFRESH_TTL_BOOT_TEST_20260822.txt` | `c937bbdc76cf88b49877e3cf08d34154f7c1d3be14b238e1d474cc4fcd4b21b0` |

> اختبار `test:boot` يثبت إنشاء تطبيق Nest اختباري معزول وحقن ChatModule؛ لا يثبت تشغيل عملية الإنتاج الكاملة أو ظهور `Nest application successfully started` أو الاتصال الحقيقي بـMongoDB وRedis.

> **الحكم:** هذه الدفعة تغلق فرق TTL المحدد فقط. لا تعني اكتمال Auth Contract V1؛ عقد register والموافقات، صدق قناة OTP في fallback، والتكامل الحي وSandbox ما زالت تتطلب دفعات واختبارات منفصلة.
