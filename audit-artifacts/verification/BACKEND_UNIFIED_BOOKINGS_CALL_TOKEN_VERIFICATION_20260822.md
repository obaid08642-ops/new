# تحقق دفعة `call-token` للحجوزات الموحدة — 2026-08-22

> **الدليل محلي فقط.** لا يوجد تشغيل على Sandbox أو الإنتاج، ولا توجد مفاتيح LiveKit حقيقية ضمن السورس أو هذا السجل. اختبار JWT يستخدم مفاتيح اختبار مؤقتة داخل process الاختبار فقط. كما أن `npm run test:boot` أدناه لا يساوي تشغيل `node dist/main.js` ولا يثبت اتصال MongoDB/Redis أو عدد المسارات أو جاهزية الإنتاج.

## السلوك المنفذ

| المصدر أو المسار | السلوك المحدد | التغطية المحلية |
|---|---|---|
| `LiveKitService.createBookingToken` | ينشئ JWT لغرفة الحجز بعمر **10 دقائق** (`exp - nbf = 600`) عند وجود متغيري بيئة LiveKit. | اختبار JWT بمفاتيح اختبار لا يتصل بخدمة خارجية. |
| `LiveKitService.issueBookingCallToken` | يقرأ الموعد، ويعيد `404` إن لم يكن المستخدم هو المريض أو الطبيب المعين، ويرفض حجوزات غير video، والحالات النهائية، وأي وقت خارج نافذة ±15 دقيقة من `slot_start`. | اختبارات للمريض، الطبيب، الغريب، الحجز غير المرئي، والنافذة الزمنية. |
| `GET /api/v1/unified-bookings/{id}/call-token` | يمرر هوية JWT إلى خدمة token ويعيد فقط `{ provider: "livekit", token, room }` عند نجاح التحقق. | البناء يثبت ربط الوحدة؛ لا يوجد طلب HTTP حي. |
| `audit-artifacts/nabd-patient-api-openapi.json` | يصف المسار الجديد، حراسة bearer، 200، والفشل 400/401/404/503. | تم parse للملف والتحقق من وجود المسار ووصف TTL عشر دقائق. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_UNIFIED_BOOKINGS_CALL_TOKEN_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **79 suites / 445 tests passed**، exit 0 | `BACKEND_UNIFIED_BOOKINGS_CALL_TOKEN_FULL_TEST_20260822.txt` | `f247a7c4ef905ff362d10e149b3a070faf42ff88f1975d3ccc94dcb6169b7c91` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_UNIFIED_BOOKINGS_CALL_TOKEN_BOOT_TEST_20260822.txt` | `4167ece4250e9d50ac1c2b632be736504d5d74b488719f7fa735dccf2ef5cdec` |

## الحدود الصريحة

| بند | الحالة الفعلية |
|---|---|
| اتصال LiveKit فعلي أو قبول token من غرفة حية | **غير متحقق.** عند غياب `LIVEKIT_API_KEY` أو `LIVEKIT_API_SECRET` يفشل المصدر مغلقاً بـ`LIVEKIT_NOT_CONFIGURED`. |
| call-token لغير video أو خارج النافذة أو لحالة منتهية | **غير متاح عمداً**؛ لا يوجد token اصطناعي أو fallback. |
| وقت الموعد وتوافق المنطقة الزمنية في Sandbox/الإنتاج | **غير متحقق.** الاختبارات محلية وتثبت المنطق فقط. |
| الدفع، payment intent، وحجز slot مؤقت لمدة 10 دقائق قبل الدفع | **غير منفذ بهذه الدفعة.** مدة token عشر دقائق لا تعني قفل slot أو تكامل payment. |
| إقلاع Nest الإنتاجي وعدد المسارات وتكامل Mongo/Redis/LiveKit | **غير متحقق.** يبقى الحكم NO-GO إلى توفر بيئة معتمدة واختبارها. |

ظهرت تحذيرات الاختبارات المحلية المعروفة، منها Mongoose duplicate index وغياب S3 ورفض webhook عند غياب `MOYASAR_WEBHOOK_SECRET` بصورة fail-closed. هذه ليست دليلاً على نشر أو نجاح خدمة خارجية.
