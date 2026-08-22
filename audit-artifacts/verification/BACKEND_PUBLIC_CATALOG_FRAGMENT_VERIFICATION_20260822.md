# تحقق دفعة شظية الكتالوج العامة — 2026-08-22

> **التحقق محلي فقط.** لا توجد Mongo تشغيلية أو CDN أو Sandbox/إنتاج في هذا التحقق. اختبار `test:boot` تطبيق Nest معزول لـChatModule وليس إقلاع `node dist/main.js`.

## السلوك المنفذ

| المصدر أو المسار | السلوك المنفذ | التغطية المحلية |
|---|---|---|
| `GET /public/catalog/{locale}/{category}.json` | يعيد شظية bounded من medicines فقط، عبر خدمة خادمية ولا يعتمد أي seed أو input لإنتاج عناصر. | build يثبت تسجيل controller؛ OpenAPI JSON parse محلياً. |
| حوكمة المصدر | شرط القراءة هو `is_deleted != true`, `public_eligibility: true`, `indexing_eligibility: true`, و`medical_review_status: approved`. | اختبار يتأكد من filter كاملاً. |
| locale | يقبل `ar,en,ur,hi,bn,fil` فقط؛ يحوّل `fil` داخلياً إلى `tl` عند قراءة translations. | اختبار `fil` ورفض locale غير مدعوم. |
| category | يقبل key محدوداً `[a-zA-Z0-9_-]` بحد 80 ويُرفض المسار غير الآمن قبل query. | اختبار رفض `../private`. |
| DTO | يعيد حقول card محدودة: id/slug/name/category/form/strength/price/image/requires_prescription/availability_status؛ لا يعيد حوكمة أو حقول إدارية أو clinical details. | اختبار shape محلي. |
| حوكمة قائمة medicines العامة | أضيف `indexing_eligibility: true` إلى `publicCatalogFilter` نفسه؛ لذا تبقى النتائج العامة fail-closed عند غياب قرار indexing صريح. | الغطاء في اختبار الشظية والجناح الكامل. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_PUBLIC_CATALOG_FRAGMENT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **86 suites / 472 tests passed**، exit 0 | `BACKEND_PUBLIC_CATALOG_FRAGMENT_FULL_TEST_20260822.txt` | `6e36e4017ac203f71a96fb1be50b3ce3e2b13257084abc6fa600c610b3d01270` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_PUBLIC_CATALOG_FRAGMENT_BOOT_TEST_20260822.txt` | `bc2db208813e320bdb12b98b802697afcfa65e4d2022e7c399148a3ac52d8644` |

## الحدود الصريحة

| بند | الحالة |
|---|---|
| توليد ملف static على CDN أو cache invalidation end-to-end | **غير متحقق.** المسار HTTP ديناميكي؛ لا توجد عملية نشر fragment خارجية مثبتة. |
| اكتمال translations لكل سجل indexable في بيانات تشغيلية | **غير متحقق.** المصدر يرجع fallback خادمي مشروع، لكنه لا يثبت readiness للبيانات الحية. |
| Sandbox/الإنتاج وإقلاع Nest التشغيلي | **غير متحقق.** لا ادعاء نشر أو GO. |
