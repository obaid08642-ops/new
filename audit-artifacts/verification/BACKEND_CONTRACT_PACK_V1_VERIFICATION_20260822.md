# سجل تحقق حزمة عقود الباك إند V1

**النطاق:** هذا السجل يثبت عمليات تحقق محلية قابلة لإعادة التشغيل على فرع `backend/contract-pack-v1`. لا يثبت نشر Sandbox أو إنتاج؛ لا توجد في هذا السجل ادعاءات عن عنوان حي أو تشغيل ترحيل قاعدة بيانات في بيئة بعيدة.

| البوابة | الأمر المنفذ | النتيجة | الدليل النصي | SHA-256 |
|---|---|---:|---|---|
| بناء Nest | `npm run build` | ناجح | `BACKEND_CONTRACT_PACK_V1_NEST_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| اختبار الباك إند الكامل | `npm test -- --runInBand` | 78 suites / 425 tests ناجحة | `BACKEND_CONTRACT_PACK_V1_FULL_TEST_20260822.txt` | `2dfafddf888ace5e5a9cd9d7604a20ef34c074cc87c67f01fd8388150acdf16a` |
| اختبار إقلاع Nest المعزول | `npm run test:boot` | 1 suite / 1 test ناجحة | `BACKEND_CONTRACT_PACK_V1_NEST_BOOT_TEST_20260822.txt` | `89dbb41416baa5dbb3ed679f3416762a2cef55d208ffcfcb66f1c19be9d15ec4` |

> اختبار الإقلاع ينشئ **تطبيق Nest اختباري معزولاً** ويراجع حقن `ChatModule` و`ChatGateway` و`ChatService` من دون أخطاء DI، مع عزل خدمة نشر الكتالوج التي تتطلب اتصال قاعدة بيانات خارجي. لا يثبت هذا الاختبار تنفيذ `node dist/main.js` أو ظهور `Nest application successfully started` أو عدّ المسارات؛ وهو ليس بديلاً عن إقلاع التطبيق كاملاً مع MongoDB وRedis وبيئة أسرار حقيقية.

## تحذيرات غير حاجبة مرصودة

ظهر تحذير Mongoose عن فهرس مكرر في `participant_ids`، وتحذير عن خاصية `errors` المحجوزة، ورسائل fail-closed متعمدة لمسار webhook عند غياب سر الاختبار. لم تفشل أي بوابة بسبب هذه الرسائل؛ ينبغي معالجتها قبل تدقيق تشغيل الإنتاج لتقليل الضجيج التشغيلي، لكنها ليست دليلاً على نجاح نشر حي.

## ما يلزم قبل اعتماد Sandbox

يتطلب اعتماد Sandbox تشغيلاً مستقلاً بالمتغيرات البيئية غير السرية عبر مدير أسرار، وتوفراً حقيقياً لـMongoDB وRedis وموفّر SMS والبريد وLiveKit والدفع، ثم فحص OpenAPI المنشورة واختبارات success/failure/ownership/idempotency replay ضد حسابات Sandbox.
