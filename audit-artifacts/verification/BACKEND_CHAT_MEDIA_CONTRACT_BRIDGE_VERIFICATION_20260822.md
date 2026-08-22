# تحقق دفعة chat وmedia الخاصة — 2026-08-22

> **هذا تحقق محلي فقط.** لم يتم استخدام Sandbox أو الإنتاج أو مفاتيح LiveKit/S3/JWT الحقيقية. السجلات لا تثبت اتصال خدمة خارجية أو إقلاع Nest الإنتاجي أو عدد مساراته. اختبار `test:boot` هو تطبيق Nest معزول للتحقق من DI في ChatModule فقط.

## السلوك المنفذ

| الجزء | السلوك المنفذ | اختبارات محلية مباشرة |
|---|---|---|
| `POST /chat/threads/{threadId}/messages` | أصبح `Idempotency-Key` إلزامياً عبر الـinterceptor العالمي. يقبل `{ body, media_ids? }` فقط؛ `attachment_url` العام يرفض. | يثبت الاختبار قبول media مملوك للمرسل ومربوط بالمحادثة ورفض media الأجنبي أو الرابط العام ووجود metadata الإلزامي. |
| ملكية chat | أي مستخدم ليس مشاركاً في thread يتلقى `404 thread_not_found` بدلاً من `403` كاشف لوجود المحادثة. | اختبار مباشر لـ`getThread` للغريب، واختبار gateway يمنع الانضمام عند الفشل. |
| `POST /chat/threads/{threadId}/read` | يدعم `up_to_message_id` ويقيّد تحديث read receipt إلى الرسائل حتى marker المملوك لنفس thread. | اختبار query المحدد بـ`createdAt <= marker.createdAt`. |
| `GET /chat/threads/{threadId}/rt-token` | JWT مخصص للمحادثة لمدة 10 دقائق، بعلامة `purpose=chat_rt` وaudience `chat-rt` و`thread_id`، ويصدر للمشارك فقط. | اختبار TTL والـaudience والـthread scope. |
| Socket.IO gateway | rt-token لا يسمح بالانضمام إلا إلى الغرفة المحددة فيه؛ JWT العادي يبقى وفق حماية الخدمة القائمة. | اختبار `thread_token_scope_mismatch` قبل استدعاء خدمة العضوية. |
| `POST /media/upload` و`POST /media/presigned` | لم يعد API يقبل folder حرّاً أو يعيد download URL عاماً. يسجل `MediaAsset` خاصاً يحمل `owner_id`, `purpose`, `thread_id?`, metadata، ويقبل purposes محددة فقط. | اختبارات لرفض رفع chat من غير المشارك، وحفظ owner/purpose/thread، ورفض purpose/binding غير صالح. |
| `GET /media/{id}/url` | يولد URL GET موقعاً لمدة 15 دقيقة للمالك أو لمشارك آخر في نفس chat؛ الملف غير المرئي يظهر `404`. | اختبار للمشارك المسموح والغريب دون استدعاء مولد الرابط. |
| التخزين | `MediaService` يفشل مغلقاً إن غابت إعدادات S3/R2؛ upload وdownload private ولا يعتمدان على `S3_PUBLIC_BASE_URL`. | البناء واختبارات الوحدة؛ لا يوجد رفع S3 فعلي. |
| OpenAPI | حدّثت تعريفات الرسائل، read، rt-token، upload/presigned media وsigned URL مع bearer/errors/idempotency. | JSON parse والتحقق من المسارات وهيدر `Idempotency-Key`. |

## البوابات المحلية المدفوعة

| الأمر | النتيجة الفعلية | ملف الإخراج الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_CHAT_MEDIA_CONTRACT_BRIDGE_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **81 suites / 457 tests passed**، exit 0 | `BACKEND_CHAT_MEDIA_CONTRACT_BRIDGE_FULL_TEST_20260822.txt` | `30b78b9b2ed5c554c282f5db8971a9f63b2458b5d5eb7fd28401edb26d8ef9f6` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_CHAT_MEDIA_CONTRACT_BRIDGE_BOOT_TEST_20260822.txt` | `ec5f8bddc9c12342f0a69d7aecbc43932581a7e2aeb9088dd11e3bd24c71dfd1` |

## الحدود الصريحة

| البند | الحالة الصادقة |
|---|---|
| تحقّق S3/R2 أو انتهاء URL الموقع على خدمة حية | **غير متحقق.** لا يوجد bucket/config معتمد ولا upload/download خارجي. |
| فحص المحتوى المرفوع antivirus، malware scanning، وcontent sniffing | **غير منفذ بهذه الدفعة.** القيود الحالية امتداد وMulter size فقط؛ لا يجوز وصفها بحماية ملفات مكتملة. |
| ربط `order_prescription` و`report` بكائن صحي أو طلب محدد ومالك ذلك الكائن | **جزئي.** تُحفظ purpose وowner binding، لكن لا يوجد resource-specific ID/ownership resolver بعد. |
| تأكيد وصول Socket.IO حي بـrt-token على بيئة منشورة | **غير متحقق.** التحقق محلي على منطق JWT والغرفة فقط. |
| replay HTTP فعلي لمسار chat على Sandbox | **غير متحقق.** المسار موسوم idempotency واختبرنا metadata؛ يلزم حسابات وبيئة معتمدة لطلب replay فعلي. |
| إقلاع `node dist/main.js`، Mongo/Redis، وSandbox/الإنتاج | **غير متحقق.** لا ادعاء GO أو نشر. |

ظهرت تحذيرات الجناح المحلي المعروفة، ومنها duplicate Mongoose index، وغياب S3 في اختبارات التخزين المنفصلة، ورفض webhook دون `MOYASAR_WEBHOOK_SECRET` بصورة fail-closed. هذه التحذيرات محفوظة في السجل الخام ولا تمثل نجاح تكامل خارجي.
