# Nabd Plus Web — تدقيق الجاهزية الإنتاجية الصادق

## الحكم المختصر

المشروع **ليس جاهزًا 100% للإنتاج الكامل** بعد. الحالة الحالية هي Web read-only production candidate قوي ومختبر، يغطي الرحلات التي أمكن إثبات عقودها الحقيقية، لكنه لا يطابق كل Mobile capabilities ولا يحتوي كل mutations أو realtime/video/media flows، ولم يُثبت بعد على Staging/Server عام باختبارات قبول حية.

## ما اكتمل فعليًا

تم تنفيذ login وserver-side session و2FA verification، pharmacy/orders read-only، cart/checkout/prescription previews read-only، order tracking، appointments list/detail، diagnostics list/detail، health score informational، health reports metadata، insurance overview، mental-health read-only dashboard، وinsurance claims read-only.

آخر slice أضاف `GET /insurance/claims` مع BFF GET-only allowlist وparser يسمح فقط بـ `id/service/status/date`. لا تُعرض patient identifiers أو amounts أو covered values أو documents أو payment/refund actions.

## البيانات الوهمية والـfallback

لم يُعثر في browser-facing production code على `mock`, `fake`, `dummy`, `fixture` أو seed patient data. truthful-runtime gate نجح على 195 ملف production source. القيم الثابتة الموجودة هي labels، status translations، empty/error copy، design tokens، ومحتوى الأمان؛ وهي ليست سجلات مريض ولا substitute backend data.

وجد تدقيق Mobile تاريخيًا قيمًا hardcoded عولجت داخل Mobile نفسه، منها loyalty `1,250` ونسخة Reports الثابتة القديمة. كما توجد fallback labels مثل “Nabd patient” في Mobile عند غياب الاسم؛ هذه ليست patient record حقيقية لكنها تحتاج قرار UX واضحًا. Web لا ينقل هذه القيم إلى صفحات خاصة.

## الفجوات التي تمنع 100%

| المجال | المتبقي الحقيقي | سبب عدم الإغلاق |
|---|---|---|
| Auth/onboarding | register، forgot/reset password، resend/expiry/lockout، consent، provider onboarding | عقود DTO وحالات 429 وrefresh/logout متعدد الأجهزة لم تُثبت حية بالكامل |
| Consultations | doctor/provider search، slot locking، booking/cancel/reschedule، waiting room، LiveKit/video، doctor chat، rating | mutations وrealtime/video ownership/idempotency غير مغلقة |
| Pharmacy | add-to-cart، prescription scan/OCR، checkout، payment، reorder، pharmacist chat، coupon/address | payment/webhook/protected-media/idempotency contracts غير مثبتة |
| Diagnostics | packages/search/compare، sample booking، tracking، insurance upload/approval، reports/results، protected PDF | media authorization، logistics status machine، upload/download contracts غير مثبتة |
| Family | invite/join/permissions/consent، member health، family chat/calendar | membership authorization وconsent/audit contracts ناقصة |
| Insurance | add policy، coverage check، network providers، submit claim، copay/payment split، refund | sensitive documents والـfinancial mutation contracts غير مثبتة |
| Mental Health/AI | breathing/meditation/journal، assessment، therapist matching، crisis support، AI assistant/triage، symptom checker | AI schema، consent، retention، escalation/crisis policy غير مثبتة |
| Nutrition/Maternity/Wearables/Emergency | كل هذه hubs وtrackers وSOS/location/voice flows | device/location/background-processing/emergency contracts ناقصة |
| Orders/Wallet/Loyalty/Returns/Support | refunds، wallet، top-up، loyalty، returns، reviews، tickets/support chat | payment/PCI/webhook/audit/SLA contracts ناقصة |
| Content/Settings | articles/bookmarks/community/search/privacy export/deletion/settings actions | content/moderation/privacy/legal contracts ناقصة |
| Operations | Staging E2E، deployment/rollback/monitoring، CSP/HSTS/CSRF/rate-limit، pen test، Web Vitals | البيئة الحية والحسابات وعمليات التشغيل لم تُفتح بعد |

## التصميم والـUX والـanimation

الأساس الحالي **premium ومرتب**: palette صحية فاتحة teal/ink، typography واضحة، cards ذات radius وظلال ناعمة، vector icons، hierarchy جيد، RTL/i18n بست لغات، وحالات empty/error/forbidden صريحة. الفحص البصري للصفحة العامة وشاشة الدخول أكد أن النتيجة قابلة للاستخدام وتبدو احترافية.

لكن لا يصح القول إن التصميم “الأفضل عالميًا” أو إنه حصل على ترتيب/score أو أنه لا يشبه أي تطبيق؛ لم يُجرَ benchmark رسمي مع Figma أو design award rubric. كما أن الـanimation الحالية محدودة غالبًا في transitions وhover وبعض reduced-motion rules. لا توجد بعد منظومة موحدة ومثبتة لكل route تشمل route transitions، loading skeleton choreography، staggered entrances، modal/sheet motion، focus/pressed states، وRTL-safe motion.

للوصول إلى مستوى premium عالمي قابل للدفاع عنه يلزم design source of truth: Figma أو token spec نهائي، typography/fonts مرخصة، icon/brand asset set، component states، responsive snapshots لكل route، visual regression، وقواعد motion موحدة مع `prefers-reduced-motion`.

## الاختبارات الحالية

بعد إصلاح timeout لاختبار Dashboard SSR، نجحت full Vitest: **65 test files passed، 14 skipped، 119 tests passed، 23 skipped**. نجح truthful-runtime gate على **195 production files**، وTypeScript، وproduction build، وdiff check. نجاح هذه الاختبارات لا يساوي E2E حيًا على Backend/Staging Production.

## تعريف الإغلاق الحقيقي لـ100%

لا يمكن إعلان 100% قبل أن تصل contract packs التالية من Backend: auth/onboarding، transactional pharmacy/order/payment، booking/realtime/video، diagnostics media/results/tracking، insurance payment/claims/documents، family permissions، AI/mental-health safety، wearable/location/emergency، wallet/loyalty/returns/support، ثم تشغيل owner/stranger وreplay/timeout وE2E على Staging بحسابات Sandbox، وإكمال accessibility/performance/security/deployment gates.

حتى وصول هذه العقود، الإبقاء على الميزات Deferred هو التنفيذ الصحيح أمنيًا، وليس نقصًا مخفيًا أو data وهمية.
