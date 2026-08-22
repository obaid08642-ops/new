# تحقق دفعة جسر الحجوزات النقدي المحدود — 2026-08-22

> **نطاق الدليل: محلي فقط.** لا يوجد URL لـSandbox أو OpenAPI حي جديد أو حسابات معتمدة، ولم يُنفذ أي طلب على Sandbox أو الإنتاج. كما أن `npm run test:boot` أدناه هو اختبار Nest معزول للتحقق من DI، وليس تشغيل `node dist/main.js` ولا يثبت إقلاع الإنتاج أو اتصال MongoDB/Redis أو عدد المسارات.

## ما نفذته هذه الدفعة

| المسار أو المصدر | السلوك الذي تحققه الدفعة | الاختبار المحلي المباشر |
|---|---|---|
| `GET /api/v1/care/doctors/{id}/slots` | كل slot مولد خادمياً يضم الآن `id` canonical يساوي `start`؛ لا يوجد معرف opaque يصنعه العميل. | يغطي جسر الحجز رفض `slot_id` غير الموجود في قائمة الخادم. |
| `POST /api/v1/unified-bookings` | جسر **cash-only** للاستشارة: يتحقق من `doctor_id` و`slot_id` و`type` مقابل slot خادمي متاح، ثم يستدعي خدمة المواعيد بالسعر/الحالة الخادميين فقط. يعيد `{ booking_id, status }`. | نجاح نقدي، رفض payment غير النقدي، رفض slot غير خادمي، و`409` عند slot ظاهر لكنه غير متاح. |
| `POST /api/v1/unified-bookings/{id}/cancel` | فحص ملكية المريض أولاً بـ`getOne`؛ الـID الأجنبي يصل إلى `404` قبل محاولة الإلغاء. | اختبار عزل يثبت عدم استدعاء الإلغاء بعد `404`. |
| `POST /api/v1/unified-bookings/{id}/reschedule` | يحقق replacement slot خادمياً ويستدعي إعادة الجدولة. خدمة المواعيد تنشئ البديل أولاً، وتمنع التعارض، وتعوض بحذف البديل إن فشل حفظ انتقال الأصل. | اختبار لإنشاء البديل قبل تعديل الأصل، اختبار تعارض، واختبار تعويض. |
| mutations المذكورة | موسومة بـ`@RequireIdempotency()`؛ الاختبار يثبت metadata على create/cancel/reschedule. يظل الـinterceptor العالمي مسؤولاً عن cache/replay لمدة 24 ساعة. | اختبار metadata محلي؛ ليس اختبار HTTP replay فعلياً على Sandbox. |
| `audit-artifacts/nabd-patient-api-openapi.json` | أضيفت تعريفات OpenAPI المتتبعة للمسارات الثلاثة مع هيدر `Idempotency-Key` الإلزامي وDTO النقدي وحدود التنفيذ. | تم parse للـJSON واستخراج المسارات الثلاثة بنجاح. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_UNIFIED_BOOKINGS_CASH_BRIDGE_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **79 suites / 439 tests passed**، exit 0 | `BACKEND_UNIFIED_BOOKINGS_CASH_BRIDGE_FULL_TEST_20260822.txt` | `6c4cfbd36ad2f1462976b0f0d0207a1e6f575ecac1d7ed72c09d6aa3f2658be9` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_UNIFIED_BOOKINGS_CASH_BRIDGE_BOOT_TEST_20260822.txt` | `a6468d97a4faa7568307477ef8ba6a21febeba01f2ac475d60e1ea336e6251fd` |

## القيود المتعمدة وغير المكتملة

| بند العقد | الحالة الصادقة |
|---|---|
| الدفع بالبطاقة، `payment_intent`، وربط `payment_method_id` الحقيقي | **غير منفذ.** أي قيمة غير `cash` تُرفض بـ`payment_method_not_supported` ولا يوجد نجاح اصطناعي. |
| قفل slot لمدة 10 دقائق بانتظار الدفع والتحرير التلقائي | **غير منفذ في هذا الجسر النقدي.** لا يجوز وصفه بأنه slot-lock contract كامل. الحجز النقدي يُنشأ ويؤكد فوراً من خدمة المواعيد الحالية. |
| مسار `GET /unified-bookings/{id}/call-token` وTTL 10 دقائق ونافذة ±15 دقيقة | **غير منفذ.** خدمة LiveKit القائمة تعمل بTTL مختلف ولا تُعاد تسميتها امتثالاً للعقد. |
| قواعد إلغاء/إعادة جدولة كاملة وفق جميع سياسات المنتج ومدفوعات/استردادات الإنتاج | **جزئية.** أضيفت سلامة التعارض وترتيب الكتابة محلياً، لكن لا يوجد تحقق Sandbox/PSP أو اختبار HTTP حي. |
| replay عبر HTTP لنفس `Idempotency-Key` لمسارات الجسر | **غير مثبت بهذه الدفعة خارج الوحدة.** تم وسم المسارات واختبار الـmetadata؛ سلوك الـinterceptor مغطى في جناحه القائم، لكن يلزم اختبار HTTP بعد توفير بيئة معتمدة. |
| Sandbox أو الإنتاج، إقلاع Nest الفعلي، اتصال Mongo/Redis، وعدد المسارات | **غير متحقق.** لا يوجد ادعاء نشر أو جاهزية إنتاج أو GO. |

## تحذيرات الجناح الكامل

ظهرت التحذيرات المحلية المعتادة، ومنها Mongoose path `errors` المحجوز، وغياب إعداد S3 مع fallback الاختباري، ورفض webhook عند غياب `MOYASAR_WEBHOOK_SECRET` بصورة fail-closed. لم تُخفَ هذه التحذيرات ولا تعني نشر خدمة أو نجاح تكامل خارجي.
