# مصفوفة الفجوات المتبقية — Backend Contract Pack V1

**التاريخ:** 2026-08-22
**الفرع المرجعي عند الإعداد:** `backend/contract-pack-v1`
**منهج الحالة:** لا تُعد خانة «منفذ محلياً» دليلاً على Sandbox أو إنتاج. تشير الحالات فقط إلى كود متتبع وبوابات محلية مدفوعة.

| منطقة العقد | الحالة | الدليل أو الرأس المتتبع | الفجوة/الخطوة التالية ذات الأولوية |
|---|---|---|---|
| Auth OTP / exchange / register consent | منفذ محلياً، مع حدود قناة التسليم | `a7d94b6`, `e4ee7b3`, `f2ce163` | تثبيت channel truth عند fallback push، واختبار Sandbox للـOTP/replay/TTL. |
| Profile / health / family | جسور سابقة محلية؛ لم يعاد فحص كل المسارات في هذه المرحلة | commits قبل `bf807b0` | مراجعة metadata idempotency لكل mutation ثم owner/unauth/replay على Sandbox. |
| Cart items | منفذ محلياً مع idempotency | `199e186`, `bf807b0` | اختبار HTTP/Sandbox فعلي لكل create/patch/delete/replay. |
| Checkout | **جزئي ومقصور على cash** | `be22b8e` | card/payment intent، prescription media binding، stock 409، coupon 422، payment 402، وSandbox. |
| Unified bookings | **جزئي ومقصور على cash** | `67152d5` | ربط قفل 10 دقائق بتدفق الدفع؛ مزود دفع حقيقي؛ قواعد الإلغاء 24h واختبارات متزامنة. |
| Call token | منفذ محلياً ضمن الموعد | `780b84f` | اتصال LiveKit/Sandbox حي، وتحقق role/owner/time في بيئة منشورة. |
| Home-care booking | DTO مملوك محلياً | `24727d7` | Sandbox owner/stranger، وresolver avatar موثوق عند توفر مصدر معتمد. |
| Prescriptions read | DTO محدود محلياً | `e81fc28` | اختبار ProviderProfile الفعلي وSandbox؛ مراجعة upload/photo contract لاحقاً. |
| Chat | message media IDs + read marker + rt-token محلية | `8110130` | Socket.IO حي، Redis adapter عند التوسع، replay HTTP، وفحص chat lifetime في Sandbox. |
| Media | purpose/owner/signed URLs محلية | `8110130` | S3/R2 حي، content scanning/sniffing، وربط order_prescription/report بموارد محددة. |
| Notifications/settings/sessions | allowlist وجلسة مملوكة محلياً | `7de3ed1` | Redis حي، audit session revocation، replay HTTP، ومراجعة فئات المنتج إن توسعت. |
| Article bookmarks | owner-scoped/idempotent محلياً | `1fac194` | migration unique index لـ`{user_id,article_id}` واختبار Mongo متزامن وSandbox. |
| Public catalog/specialties | غير معاد التدقيق في هذه المرحلة | — | تدقيق مصدر count/public eligibility ثم اختبارات DTO وOpenAPI. |
| إقلاع Nest تشغيلي | غير منفذ | — | بيئة Mongo/Redis/config آمنة؛ `node dist/main.js` وتوثيق startup/route count. |
| Sandbox وProduction | غير متحققان | — | رابط OpenAPI حي وحسابات معتمدة؛ لا إنتاج قبل اجتياز matrix owner/unauth/failure/replay. |
| Mobile P1 | إصلاحات محلية مدفوعة، ليس GO | `c1d7b01` | عقود OTP المنشورة، device E2E، Sandbox، وإغلاق تحذير Jest/Expo. |

> أي بند يحمل «جزئي» أو «غير متحقق» لا يجوز عرضه كجاهزية نشر أو اكتمال Contract Pack V1.
