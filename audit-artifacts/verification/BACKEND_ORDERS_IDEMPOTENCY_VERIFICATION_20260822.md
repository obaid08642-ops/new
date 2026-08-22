# تحقق دفعة idempotency لمسارات orders — 2026-08-22

> **التحقق محلي فقط.** لا يوجد Sandbox أو إنتاج أو replay HTTP حقيقي لهذه المسارات. اختبار `test:boot` تطبيق Nest معزول لـChatModule وليس إقلاع Nest التشغيلي.

## التغيير المحدود المنفذ

| المسار | التغيير | التغطية المحلية |
|---|---|---|
| `POST /orders/{id}/reorder` | وُسم بـ`@RequireIdempotency()` لرفض الطلب قبل handler عند غياب المفتاح عبر الـinterceptor العالمي. | اختبار metadata. |
| `POST /orders/{id}/reorder-partial` | وُسم بـ`@RequireIdempotency()` للسلوك نفسه. | اختبار metadata. |
| `POST /orders/{id}/cancel` | وُسم بـ`@RequireIdempotency()` للسلوك نفسه. | اختبار metadata. |

## الحدود الصريحة

| بند | الحالة |
|---|---|
| `reorder` كعقد ينشئ سلة جديدة | **غير مكتمل/غير معاد بناؤه بهذه الدفعة.** التنفيذ الموروث ينشئ Order جديداً عبر `OrdersService.create`؛ لا يجوز وصفه بأنه يطابق نص العقد الذي يطلب سلة جديدة. |
| 409 عند الإلغاء بعد مرحلة غير قابلة للإلغاء | **غير مثبت بهذه الدفعة.** يلزم مراجعة state matrix واختبار mapping HTTP. |
| HTTP replay الفعلي وowner/unauth على Sandbox | **غير متحقق.** اختبار metadata لا يعادل رحلة HTTP. |
| إقلاع تشغيلي وSandbox/الإنتاج | **غير متحقق.** لا ادعاء نشر أو GO. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_ORDERS_IDEMPOTENCY_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **85 suites / 469 tests passed**، exit 0 | `BACKEND_ORDERS_IDEMPOTENCY_FULL_TEST_20260822.txt` | `63ac9550808f90b2cc66088e64fb582d406341000b4f6158bfed99c4d2e64dc6` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_ORDERS_IDEMPOTENCY_BOOT_TEST_20260822.txt` | `41d17cc266b8474abc45f4f1b9e724aecd82c82c38f2fd73426a314c37523216` |
