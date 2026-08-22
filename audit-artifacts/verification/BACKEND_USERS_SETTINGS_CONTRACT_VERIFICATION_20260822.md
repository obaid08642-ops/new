# تحقق دفعة إعدادات المستخدم والجلسات — 2026-08-22

> **نطاق التحقق محلي فقط.** لا يوجد Sandbox أو إنتاج أو Redis معتمد تم الاتصال به. اختبار `test:boot` تطبيق Nest معزول لـChatModule ولا يعادل `node dist/main.js` أو فحص اتصال الخدمات الخارجية.

## السلوك المنفذ

| المصدر أو المسار | السلوك المحدد | التغطية المحلية |
|---|---|---|
| `PATCH /users/me/notification-settings` | يقبل فقط `{ channels?, categories? }`. القنوات allowlist هي `push,email,sms`، والفئات allowlist هي `appointments,orders,health,chat,account,marketing`، وكل قيمة Boolean. يرفض unknown/dot/`$`/non-Boolean. | اختبارات تطبيع السجل المسطح السابق، دمج PATCH الآمن، ورفض المفاتيح والقيم غير المسموحة. |
| قراءة إعدادات الإشعارات | تعيد DTO ثابتاً مقسماً إلى `channels` و`categories`، وتهاجر القراءة القديمة المسطحة بأمان دون تمرير مفاتيح مجهولة. | اختبار legacy DTO. |
| `DELETE /users/me/sessions/{jti}` | يتحقق من membership في `refresh_user:{user}` قبل الحذف؛ JTI غير المملوك يرجع `404` ولا ينفذ `DEL`/`SREM`. | اختبار ملكية مباشر. |
| mutations المذكورة | وسمت بـ`@RequireIdempotency()` لتطبيق شرط المفتاح عبر الـinterceptor العالمي. | اختبار metadata؛ لا يوجد HTTP replay على Sandbox. |
| OpenAPI | أضيف schema مغلق لـnotification settings ومسار session delete بالـbearer و`Idempotency-Key` وأخطاء 404/503. | JSON parse والتحقق من المسارات محلياً. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_USERS_SETTINGS_CONTRACT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **82 suites / 462 tests passed**، exit 0 | `BACKEND_USERS_SETTINGS_CONTRACT_FULL_TEST_20260822.txt` | `d8e364511a36b7450a18d20819377f170e2d0159e221deb9fd1a6003c7c55157` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_USERS_SETTINGS_CONTRACT_BOOT_TEST_20260822.txt` | `12f4753ea79538a2e764437389b34d025a4921f3024ff7535cf7f46b3f521315` |

## الحدود الصريحة

| بند | الحالة الفعلية |
|---|---|
| حذف refresh session أو replay فعلي ضد Redis حقيقي | **غير متحقق.** اختبارات هذا المسار تستخدم stub محلي فقط. |
| replay HTTP الفعلي للمسارين | **غير متحقق.** وسم الـidempotency موجود وتغطيه اختبارات metadata/interceptor القائمة، لكن يلزم Sandbox مع حسابات مصرح بها. |
| فئات الإشعارات الموسعة غير المذكورة في الـallowlist | **ترفض عمداً** حتى تُنشر في عقد مراجع ووثائق OpenAPI واختبارات. |
| إقلاع Nest الإنتاجي، Mongo/Redis، Sandbox، والإنتاج | **غير متحقق.** لا ادعاء نشر أو جاهزية GO. |

تظهر المخرجات الخام التحذيرات المحلية المعروفة (Mongoose، S3 في اختبارات التخزين، وwebhook fail-closed بدون secret)، ولا تمثل نجاح تكامل خارجي.
