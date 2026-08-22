# تحقق دفعة bookmarks للمقالات — 2026-08-22

> **التحقق محلي فقط.** لم يتم إجراء replay HTTP أو اتصال Mongo/Sandbox/إنتاج. اختبار `test:boot` تطبيق Nest معزول لـChatModule ولا يعادل تشغيل Nest الإنتاجي.

## السلوك المنفذ

| المصدر أو المسار | السلوك المنفذ | التغطية المحلية |
|---|---|---|
| `POST /articles/{id}/bookmark` | يتحقق من أن المقال منشور، ثم ينفذ upsert لمستند يحمل `user_id` للمستخدم الحالي و`article_id` للمقال؛ لا يمكن كتابة bookmark لمستخدم آخر. | اختبار query/`$setOnInsert` المالك. |
| `DELETE /articles/{id}/bookmark` | يحذف فقط حيث يتطابق `user_id` الحالي و`article_id`؛ غياب bookmark يعد النتيجة المستقرة `{bookmarked:false}`. | اختبار filter الحذف. |
| المقال غير المنشور أو المحذوف | `publishedById` يرجع 404 قبل أي mutation. | اختبار يؤكد عدم استدعاء `updateOne` عند 404. |
| idempotency | المساران العقديان موسومان بـ`@RequireIdempotency()` ليطبقا عبر الـinterceptor العالمي. | اختبار metadata. |
| OpenAPI | تعريف POST/DELETE بالـarticle ID وبـbearer و`Idempotency-Key` و404. | parse محلي للـJSON والتحقق من المسارين. |

يبقى endpoint الموروث `POST /articles/bookmarks/{slug}/toggle` منفصلاً للتوافق، وليس هو المسار الذي تصفه الحزمة V1.

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_ARTICLE_BOOKMARK_CONTRACT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **84 suites / 468 tests passed**، exit 0 | `BACKEND_ARTICLE_BOOKMARK_CONTRACT_FULL_TEST_20260822.txt` | `e4939c5b6ae1a80bf78d7196e865b3a3d46e3d131c16862d2717e1957cff7d3d` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_ARTICLE_BOOKMARK_CONTRACT_BOOT_TEST_20260822.txt` | `b91f622ba46957a5b2b1f487ec7e0807f40d6ef80ee6d974d26b15593502b8e3` |

## الحدود الصريحة

| بند | الحالة الفعلية |
|---|---|
| unique index حقيقي لـ`{user_id,article_id}` ضد racing requests | **غير مثبت.** idempotency يقلل replay ضمن نطاقه، لكن يلزم index migration أو اختبار Mongo متزامن لإثبات منع duplicate المتزامن. |
| HTTP replay وملكية عبر Sandbox | **غير متحقق.** الاختبارات مباشرة محلية. |
| إقلاع Nest الإنتاجي وMongo/Redis/Sandbox/الإنتاج | **غير متحقق.** لا ادعاء نشر أو GO. |
