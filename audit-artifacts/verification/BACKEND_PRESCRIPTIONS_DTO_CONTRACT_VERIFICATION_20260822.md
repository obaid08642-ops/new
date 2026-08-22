# تحقق دفعة DTO الوصفات الطبية — 2026-08-22

> **هذا تحقق محلي فقط.** لا يوجد Sandbox أو إنتاج أو قاعدة بيانات تشغيلية تم استخدامها. اختبار `test:boot` يعزل ChatModule للتحقق من DI، ولا يمثل إقلاع `node dist/main.js` أو فحص Mongo/Redis أو عدد المسارات.

## السلوك المنفذ

| المصدر أو المسار | السلوك المنفذ | التغطية المحلية |
|---|---|---|
| `GET /prescriptions/{id}` | يبقي تحقق المشاركة: patient/doctor/pharmacy المربوطين أو admin فقط؛ غير المشارك يستلم 404 لا تكشف وجود الوصفة. | اختبارات patient/doctor/pharmacy/admin والمرضى/المزودين الغرباء. |
| DTO القراءة | يرجع فقط `id`, `status`, `items`, `issued_at`, `doctor`؛ لا يرجع `diagnosis`, `notes`, `upload_image`, أو حقول المراجعة الداخلية. | اختبار DTO يتضمن عمداً diagnosis/notes في المصدر ولا يسمح بظهورهما في النتيجة. |
| الطبيب | يقرأ اسم العرض والتخصص من `ProviderProfile` المرتبط خادمياً بـdoctor id؛ إن لم توجد بطاقة provider فالقيم `null` بدلاً من اختلاق بيانات. | اختبار hydration في stub محلي. |
| items | يقتصر على الاسم والجرعة والتواتر (`every_hours` أو `times_per_day`) والمدة، بلا internal ids أو manual-review metadata. | اختبار DTO محدود. |
| OpenAPI | يصف bearer و200 DTO المحدود و401 و404 الوجودي. | JSON parse والتحقق من security و404 محلياً. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_PRESCRIPTIONS_DTO_CONTRACT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **82 suites / 462 tests passed**، exit 0 | `BACKEND_PRESCRIPTIONS_DTO_CONTRACT_FULL_TEST_20260822.txt` | `ee6416581736fc32109bb28bd5debbc957b61662c9d5a677a2c37edb5c749580` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_PRESCRIPTIONS_DTO_CONTRACT_BOOT_TEST_20260822.txt` | `3f213db04a7f2204823cf6520eef3313032dd531a00b1f0855b89a973a52675b` |

## الحدود الصريحة

| بند | الحالة الفعلية |
|---|---|
| بيانات ProviderProfile حقيقية وتباين doctor identifiers في Sandbox/الإنتاج | **غير متحقق.** الاختبارات تستخدم stub محلياً؛ قيم doctor تصبح null عند عدم توفر profile. |
| HTTP/ownership على Sandbox أو إنتاج | **غير متحقق.** لا يوجد حسابات أو OpenAPI حية معتمدة. |
| إقلاع Nest الإنتاجي وعدد المسارات وMongo/Redis | **غير متحقق.** لا ادعاء نشر أو حكم GO. |

تبقى التحذيرات المحلية المعروفة محفوظة في المخرج الخام، ومنها Mongoose وS3 في اختبارات التخزين وwebhook fail-closed عند غياب secret؛ لا تمثل نجاح خدمة خارجية.
