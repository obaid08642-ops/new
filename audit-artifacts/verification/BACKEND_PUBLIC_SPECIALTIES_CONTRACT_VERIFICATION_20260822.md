# تحقق دفعة التخصصات العامة — 2026-08-22

> **التحقق محلي فقط.** لا توجد قاعدة Mongo حية أو Sandbox/إنتاج أو إقلاع `node dist/main.js`. اختبار `test:boot` تطبيق Nest معزول لـChatModule فقط.

## السلوك المنفذ

| المصدر أو المسار | السلوك المنفذ | التغطية المحلية |
|---|---|---|
| `GET /public/specialties` | alias عام يستدعي `CareService.specialties()`؛ لا ينسخ أو يولد بيانات تخصصات مستقلة. | build يثبت تسجيل controller؛ صحة OpenAPI محلياً. |
| عداد المزودين | يجمع فقط `ProviderProfile` حيث النوع doctor و`status: ACTIVE` و`public_eligibility: true` و`medical_review_status: approved`. | اختبار aggregate بالفلتر كاملاً. |
| المفتاح canonical | يطابق تجميع `specialty` مع `SPECIALTY_MASTER.slug` (ومع fallback legacy للاسم العربي/الإنجليزي)، بدلاً من مقارنة slug بالاسم العربي التي كانت تجعل العد صفراً. | اختبار `cardiology` و`internal_medicine`. |
| DTO | يضيف `published_provider_count` ويحتفظ بـ`count` كاسم توافق للقيمة نفسها. | اختبار القيم، وOpenAPI يصف الحقل. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_PUBLIC_SPECIALTIES_CONTRACT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **85 suites / 470 tests passed**، exit 0 | `BACKEND_PUBLIC_SPECIALTIES_CONTRACT_FULL_TEST_20260822.txt` | `310380690e8624321b02f2fc309a3114453edf8307674d01737ba9cfc895b428` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_PUBLIC_SPECIALTIES_CONTRACT_BOOT_TEST_20260822.txt` | `5db2b2d159e6bec3f0433309ff7072b4b0e7c5d4e520271c18a35a0a826a8acc` |

## الحدود الصريحة

| بند | الحالة |
|---|---|
| مطابقة كل قيم `specialty` التاريخية في Mongo مع slug/Arabic/English | **غير متحققة على بيانات تشغيلية.** fallback محدود، ويلزم migration أو تحليل بيانات Sandbox قبل تعميم دقة العد. |
| endpoint HTTP عام في Sandbox أو CDN fragment `/public/catalog/{locale}/{category}.json` | **غير متحقق/غير منفذ بهذه الدفعة.** هذه الدفعة تعالج `/public/specialties` فقط. |
| Sandbox/الإنتاج وإقلاع Nest التشغيلي | **غير متحقق.** لا ادعاء نشر أو GO. |
