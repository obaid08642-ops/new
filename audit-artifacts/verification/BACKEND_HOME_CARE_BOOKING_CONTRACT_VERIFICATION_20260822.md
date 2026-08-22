# تحقق دفعة حجز الرعاية المنزلية — 2026-08-22

> **التحقق محلي فقط.** لم يتم الاتصال بـSandbox أو الإنتاج أو Mongo تشغيلية. اختبار `test:boot` تطبيق Nest معزول لـChatModule، ولا يثبت إقلاع `node dist/main.js` أو عدد المسارات أو تكامل الخدمات الخارجية.

## السلوك المنفذ

| المصدر أو المسار | السلوك المنفذ | التغطية المحلية |
|---|---|---|
| `GET /home-care/bookings/{bookingId}` | يبحث query خادمي مقيداً بـ`{ id, patient_id: currentUser.id }`؛ الحجز المفقود أو غير المملوك يرجع 404. | اختبار owner وnon-owner مع التحقق من query. |
| DTO الاستجابة | يعيد فقط `id`, `status`, `service_type`, `scheduled_at`, `nurse`, `timeline`. | اختبار يمنع ظهور `notes`, `address`, و`clinical_notes`. |
| بيانات الممرض | `display_name` من `provider_name` المخزن في الحجز، و`avatar_url: null` لأن النموذج لا يحمل avatar موثوقاً؛ لا يتم اختلاق URL. | اختبار DTO. |
| timeline | يحول `state_history` إلى عناصر `{status,at}` كاملة فقط، ولا يمرر metadata أو ملاحظات داخلية. | اختبار حالتي state history. |
| OpenAPI | أضيف bearer وDTO المحدود وحالة 404 للغريب. | parse محلي للـJSON وتحقق من security/404. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_HOME_CARE_BOOKING_CONTRACT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **83 suites / 464 tests passed**، exit 0 | `BACKEND_HOME_CARE_BOOKING_CONTRACT_FULL_TEST_20260822.txt` | `1f291d92e53db75cf6d8865ee14cab646be47129802d3d98e0fb291784be6e06` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_HOME_CARE_BOOKING_CONTRACT_BOOT_TEST_20260822.txt` | `f0d0c7572ff88de876502d8896e17f653f4caacbe57f79ecc124466b1f95cad9` |

## الحدود الصريحة

| بند | الحالة الفعلية |
|---|---|
| Avatar الممرض | **غير متاح في النموذج.** يعود `null`، ولا يوجد signed media resolver بهذه الدفعة. |
| قراءة booking على Sandbox/الإنتاج واختبار owner/stranger HTTP | **غير متحقق.** الاختبارات محلية عبر mocks فقط. |
| إقلاع Nest الإنتاجي، Mongo/Redis، وبيانات provider الفعلية | **غير متحقق.** لا ادعاء نشر أو GO. |

تظل التحذيرات المحلية المعروفة في السجل الخام (Mongoose، S3 في اختبارات التخزين، وwebhook fail-closed)، ولا تعد دليلاً على نجاح تكامل خارجي.
