# تقرير حالة التنفيذ والتحقق — Backend Contract Pack V1 وموبايل P1

**التاريخ:** 2026-08-22
**المستودع:** `obaid08642-ops/new`
**الحكم الحالي:** **NO-GO**. توجد دفعات محلية مدفوعة ومختبرة، لكن لا يوجد دليل Sandbox أو إنتاج أو إقلاع Nest حقيقي مع خدماته التشغيلية.

> لا يمثل أي اختبار موثق أدناه نشرًا أو نجاحًا في الإنتاج. جميع نتائج الاختبار الموصوفة محلية، و`npm run test:boot` اختبار Nest معزول للتحقق من DI في ChatModule، وليس تشغيل `node dist/main.js`.

## رؤوس الفروع المدفوعة

| النطاق | الفرع | رابط المراجعة | الرأس المحلي والبعيد المتطابق | حالة العمل |
|---|---|---|---|---|
| Backend Contract Pack V1 | `backend/contract-pack-v1` | <https://github.com/obaid08642-ops/new/pull/new/backend/contract-pack-v1> | `24727d7186cd6829c180ef29fdaefcca46a16728` | نظيفة محلياً؛ `git ls-remote` يطابق الرأس. |
| Mobile P1 | `agent/mobile-p1-fixes-20260822` | <https://github.com/obaid08642-ops/new/pull/new/agent/mobile-p1-fixes-20260822> | `c1d7b01bcb93d774d6a6696d419b6ae308c993c5` | نظيفة محلياً؛ `git ls-remote` يطابق الرأس. |

لم يُدمج أي فرع في `main`، ولم يُستخدم force-push.

## دفعات Backend الحديثة المدفوعة

| SHA | الدفعة | الحد المنفذ بدقة |
|---|---|---|
| `be22b8e7c1e0a3e98350b5b15ac1ad95e9033f0b` | checkout النقدي | جسر `POST /cart/checkout` يعتمد السلة والعنوان الخادميين، ويقبل `cash` فقط؛ يرفض card/media غير المدعومين ولا يصطنع payment intent. |
| `67152d5b374bf2a4656a1459221497fa715d37f8` | حجز الاستشارة النقدي | جسر root محدود لـ`/unified-bookings` مع slot خادمي وملكية 404 وإلغاء/إعادة جدولة؛ ليس تدفق card/payment كاملًا. |
| `780b84f2caa5175a37a00422b61013084b7ff52b` | call-token | token LiveKit لمدة 10 دقائق للمريض/الطبيب، للحجوزات المرئية وفي نافذة ±15 دقيقة، مع fail-closed عند غياب الإعدادات. |
| `811013085cd1a865940a1475e741aed98fec0648` | chat/media | رسائل chat بـidempotency و`media_ids` خاصة، rt-token مقيد بالمحادثة، وMediaAsset خاص وروابط GET موقعة لـ15 دقيقة. |
| `7de3ed1dac5743a5ec55a01413a756e6def8956e` | settings/sessions | allowlist لإعدادات الإشعارات، وidempotency لـPATCH وDELETE session، و404 للجلسة غير المملوكة. |
| `e81fc2892236c484fe70269371a126c13b07ab67` | prescriptions | DTO محدود لـ`GET /prescriptions/{id}` يخفي `diagnosis` و`notes` ويثبت 404 للغريب. |
| `24727d7186cd6829c180ef29fdaefcca46a16728` | home-care | `GET /home-care/bookings/{bookingId}` DTO محدود للمريض المالك فقط؛ لا يعرض notes/address/clinical notes. |

توجد كذلك الدفعات السابقة للهوية وOTP/consent، health/profile/family، catalog/cart، ownership، وglobal idempotency في السجل الخطي للفرع قبل القائمة أعلاه.

## آخر بوابات التحقق المحلية المدفوعة

| الأمر | النتيجة | الدليل الخام المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_HOME_CARE_BOOKING_CONTRACT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **83 suites / 464 tests passed**، exit 0 | `BACKEND_HOME_CARE_BOOKING_CONTRACT_FULL_TEST_20260822.txt` | `1f291d92e53db75cf6d8865ee14cab646be47129802d3d98e0fb291784be6e06` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_HOME_CARE_BOOKING_CONTRACT_BOOT_TEST_20260822.txt` | `f0d0c7572ff88de876502d8896e17f653f4caacbe57f79ecc124466b1f95cad9` |

كل دفعة حديثة تحمل كذلك ملفات تحقق منفصلة في `audit-artifacts/verification/`، وتحتوي مخرجات build/Jest/boot وبصماتها وحدودها الخاصة. التحذيرات المعروفة في الاختبارات، مثل Mongoose duplicate index وغياب إعداد S3 ورفض webhook عند غياب `MOYASAR_WEBHOOK_SECRET`، محفوظة في النص الخام ولم تُخف أو تُفسر على أنها نجاح خارجي.

## موبايل P1 المدفوع

يحمل فرع الموبايل إصلاحات fail-closed لتخزين token، وauth/session، ومنع نجاحات HTTP الاصطناعية، ومنع mutation/chat queues غير المتعاقد عليها، ومنع navigation لكلمة المرور، وإزالة guest bootstrap. الدليل المرجعي هو `nabd_plus_patient_app/audit-artifacts/verification/MOBILE_P1_EXECUTION_VERIFICATION_20260822.md` في commit `c1d7b01…`.

| بوابة موبايل | النتيجة الموثقة |
|---|---|
| اختبارات P1 المستهدفة المعزولة | 9 أوامر Jest منفصلة، 12 assertion ناجحة؛ SHA-256 للملف الخام `90cd51582d93971fb2a951606d1ecbf4c0716f4db1379c6ecea0d6339e295ab4`. |
| TypeScript | `tsc --noEmit` ناجح؛ SHA-256 `112d574c3d4f4eee73efeefa7c9e83c50e62108d821c907521d91fc857284fa9`. |
| قيد Jest المجمّع | قد ينهي code 1 بسبب تحذير Expo متأخر `Cannot log after tests are done` رغم نجاح assertions؛ لذلك لا يدّعى أنه أخضر كمجموعة واحدة. |

## القيود وشروط رفع الحكم من NO-GO

| الشرط | الوضع الحالي | المطلوب قبل GO |
|---|---|---|
| إقلاع Nest الحقيقي | غير متحقق. | بيئة Mongo/Redis وإعدادات آمنة ثم `node dist/main.js` مع سطر `Nest application successfully started` وعدد المسارات موثقين. |
| Sandbox | غير متحقق. | OpenAPI/Sandbox URL منشور وحسابات مصرح بها؛ success/failure/owner/unauth/replay لكل mutation ذي صلة. |
| الإنتاج | غير متحقق. | لا ادعاء نشر؛ يلزم مسار release ومراقبة وأسرار env وتشغيل معتمد. |
| checkout والحجوزات card | غير مكتمل. | payment intent/PSP حقيقي، mapping دقيق لـ409/422/402، قفل slot لمدة 10 دقائق موصول بالدفع، واختبارات failure/replay حية. |
| Media | جزئي. | اختبار S3/R2 حقيقي، scanner/content validation، وربط `order_prescription` و`report` بمواردها ومالكيها. |
| Chat realtime | جزئي. | اختبار Socket.IO منشور بـrt-token، Redis adapter إن لزم، وHTTP replay حقيقي. |
| موبايل | ليس GO. | مواءمة OTP/register بالعقود المنشورة، device E2E، وإغلاق تحذير Jest/Expo، واختبارات Sandbox مصرح بها. |

**الخلاصة:** الفروع المدفوعة تصلح للمراجعة المستقلة تفصيلياً، لكن المشروع ليس جاهزاً للنشر أو الإنتاج حتى تتحقق الشروط السابقة بدليل مباشر.
