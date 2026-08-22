# تحديث حالة التنفيذ والتحقق — Backend Contract Pack V1 وموبايل P1

**التاريخ:** 2026-08-22
**المستودع:** `obaid08642-ops/new`
**الحكم الحالي:** **NO-GO**. توجد دفعات محلية مدفوعة ومختبرة، لكن لا يوجد دليل Sandbox أو إنتاج؛ كما أن محاولة إقلاع Nest الفعلية فشلت fail-closed لغياب إعدادات تشغيل معتمدة.

> لا يساوي نجاح build أو Jest أو `test:boot` نشرًا أو جاهزية إنتاج. اختبار `test:boot` يعزل ChatModule وDI، وليس بديلاً لإقلاع `node dist/main.js` مع Mongo/Redis وأسرار env.

## رؤوس الفروع القابلة للتحقق

| النطاق | الفرع | رابط المراجعة | الرأس المحلي والبعيد المتطابق | حالة العمل |
|---|---|---|---|---|
| Backend Contract Pack V1 | `backend/contract-pack-v1` | <https://github.com/obaid08642-ops/new/pull/new/backend/contract-pack-v1> | `b7f2481e06d7a60fbc85f1f05d684e4189a14ae5` | نظيفة محلياً؛ `git ls-remote` مطابق. |
| Mobile P1 | `agent/mobile-p1-fixes-20260822` | <https://github.com/obaid08642-ops/new/pull/new/agent/mobile-p1-fixes-20260822> | `c1d7b01bcb93d774d6a6696d419b6ae308c993c5` | تحقّق سابقاً كرأس محلي وبعيد متطابق. |

لم يُدمج أي فرع في `main`، ولم يُستخدم force-push.

## دفعات Backend المنفذة حديثاً

| SHA | الدفعة | الحد المنفذ بدقة |
|---|---|---|
| `be22b8e7c1e0a3e98350b5b15ac1ad95e9033f0b` | checkout النقدي | جسر checkout يعتمد السلة والعنوان الخادميين ويقبل cash فقط؛ ليس payment/card contract كاملاً. |
| `67152d5b374bf2a4656a1459221497fa715d37f8` | الحجز النقدي | جسر root محدود للحجز، لا يحقق card/payment أو ربط قفل 10 دقائق بالدفع. |
| `780b84f2caa5175a37a00422b61013084b7ff52b` | call-token | token LiveKit لمدة 10 دقائق للمريض/الطبيب في نافذة الموعد فقط. |
| `811013085cd1a865940a1475e741aed98fec0648` | chat/media | media خاصة وrt-token وidempotency للرسائل ضمن اختبارات محلية. |
| `7de3ed1dac5743a5ec55a01413a756e6def8956e` | users | allowlist للإشعارات وجلسات مملوكة. |
| `e81fc2892236c484fe70269371a126c13b07ab67` | prescriptions | DTO محدود يخفي diagnosis/notes ويعيد 404 لغير المشارك. |
| `24727d7186cd6829c180ef29fdaefcca46a16728` | home-care | DTO حجز محدود للمريض المالك. |
| `1fac19412ac3174fd1601818f97c315b53a66ac6` | bookmarks | `POST/DELETE /articles/{id}/bookmark` مملوك وidempotent. |
| `eca8a4c10284c1301fdff81dbdbe8c041687cd7f` | orders | idempotency لِـreorder/reorder-partial/cancel؛ لا يحول reorder الموروث إلى «سلة جديدة». |
| `0b8b17eb8f43359a0bf791ccf03f50a4a6a3bb93` | public specialties | `/public/specialties` و`published_provider_count` من providers المنشورين فقط. |
| `9016cd18c4c1389100e272c1411d9317698d7102` | public catalog | `/public/catalog/{locale}/{category}.json` من medicines العامّة والمفهرسة والمراجعة فقط. |
| `b7f2481e06d7a60fbc85f1f05d684e4189a14ae5` | real boot evidence | يوثق محاولة `node dist/main.js` الفاشلة fail-closed بسبب `JWT_SECRET` الغائب. |

## أحدث بوابات تحقق محلية للكود

| الأمر | النتيجة | الدليل المتتبع | SHA-256 |
|---|---:|---|---|
| `npm run build` | نجح، exit 0 | `BACKEND_PUBLIC_CATALOG_FRAGMENT_BUILD_20260822.txt` | `fa3465ad332372345d40b6495b5d62ac98c71342ba295bb6381fe63eceb43388` |
| `npm test -- --runInBand` | **86 suites / 472 tests passed**، exit 0 | `BACKEND_PUBLIC_CATALOG_FRAGMENT_FULL_TEST_20260822.txt` | `6e36e4017ac203f71a96fb1be50b3ce3e2b13257084abc6fa600c610b3d01270` |
| `npm run test:boot` | **1 suite / 1 test passed**، exit 0 | `BACKEND_PUBLIC_CATALOG_FRAGMENT_BOOT_TEST_20260822.txt` | `bc2db208813e320bdb12b98b802697afcfa65e4d2022e7c399148a3ac52d8644` |

## محاولة الإقلاع الفعلية

| الأمر | النتيجة | الدليل | SHA-256 |
|---|---|---|---|
| `timeout 25s node dist/main.js` | **فشل، exit 1** بعد `Starting Nest application...` لأن `JWT_SECRET` غير مهيأ؛ ظهرت أيضاً تحذيرات S3/mail الغائبة. | `BACKEND_REAL_NEST_BOOT_ATTEMPT_20260822.txt` | `babbb77e94733f725113ec376e9585b8306b644462ac813e094f3d5aee78c253` |

لا يجب إدخال secret افتراضي أو إنتاجي في Git لتجاوز ذلك. يلزم env آمن ومعتمد ثم إعادة الإقلاع للتحقق من سطر النجاح وعدد المسارات.

## موبايل P1

فرع الموبايل المدفوع يطبق fail-closed لتخزين tokens وauth/session وHTTP mutations والطوابير غير المتعاقد عليها. لا يمثل GO: لا تزال مواءمة OTP بالعقود المنشورة وdevice E2E وSandbox وحل تحذير Jest/Expo مطلوبة. الدليل المرجعي في `nabd_plus_patient_app/audit-artifacts/verification/MOBILE_P1_EXECUTION_VERIFICATION_20260822.md` عند `c1d7b01…`.

## المتبقي وشروط إزالة NO-GO

| الشرط | الوضع الحالي | المطلوب |
|---|---|---|
| Nest تشغيلي | محجوب محلياً بغياب env؛ فشل مغلق موثق. | JWT_SECRET وسائر config كـenv فقط، Mongo/Redis متاحان، ثم startup وroute count موثقان. |
| Sandbox | غير متحقق. | OpenAPI URL حي وحسابات مصرح بها؛ success/failure/owner/unauth/replay لكل mutation. |
| Production | غير متحقق. | مسار release معتمد، أسرار وobservability، وموافقة تشغيل؛ لا نشر حالياً. |
| Checkout والحجوزات card | جزئي cash-only. | PSP/payment intent حقيقي، mapping 409/422/402، وslot lock موصول بالدفع. |
| Reorder | جزئي؛ mutation محمي idempotency لكن semantics الموروثة لا تنشئ سلة. | جسر سلة مملوك + اختبارات owner/failure/replay. |
| Media/chat | جزئي محلي. | S3/R2 وSocket.IO/Redis حي وmedia scanning وSandbox. |
| Public catalog | route محلي ديناميكي، لا CDN مثبت. | نشر fragment/cache invalidation وبيانات translations حية. |

**الخلاصة:** المراجعة المستقلة تستطيع التحقق من commits والمخرجات الخام والبصمات المذكورة. الحكم يظل **NO-GO** حتى تتحقق شروط التشغيل وSandbox المباشرة أعلاه بدليل جديد.
