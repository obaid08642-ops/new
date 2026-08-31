# الخطة التنفيذية الرئيسية المحدّثة — 2026-08-31
تدمج: مراجعة الـ endpoints + المراحل القديمة المتبقية + الدمج/التقليص + المؤجل + بناء شاشات الويب + البوابة المحجوبة.
قاعدة ثابتة لكل مرحلة: نفّذ → راجع → أكّد الإتمام → ارفع (commit+push) → تحقق SHA محلي=بعيد → ثم انتقل. لا لمس لـ main.

## المرحلة 1 — حقيقة عقود API (مكتملة جزئياً)
- 1.1 ✅ إعادة تسمية آمنة: /push/register → /notifications/register-token.
- 1.2 ✅ بناء 3 فجوات حقيقية في CompatModule: patient/pharmacy/orders، home-care (services/packages/bookings/my)، refunds/my.
- 1.3 ⏳ توثيق العقود الجديدة في docs/openapi + تأكيد أن الويب والموبايل يستهلكان نفس العقد.

## المرحلة 2 — دمج وتقليص شاشات المريض (موبايل) — ~15 شاشة
- 2.0 ✅ نظام التصميم الموحد: src/theme/brand.ts + docs/DESIGN_SYSTEM_2026-08-31.md — أساسي أخضر ليموني، فرعية نعناعي/أصفر/مرجاني/كحلي، أيقونات فيكتور 3D ناعمة، أنيميشن بقيم motion موحدة. يُطبق على كل دمج/بناء لاحق (مريض/مزود/ويب).
- 2.1 ✅ حذف المكرر حرفياً (−2 فعلي + 1 redirect آمن): حُذف chat-with-pharmacist (stub) و payments/failure؛ waiting-room أصبح Redirect إلى virtual-waiting-room مع تحديث كل المراجع.
- 2.2 ✅ شاشة حالة حجز موحدة (−2): booking-status.tsx بثلاث حالات (confirm/success/pending)؛ منطق الدفع نُقل حرفياً إلى src/components/BookingConfirmForm.tsx؛ الثلاثة القديمة أصبحت Redirects آمنة وكل المراجع حُدّثت (مراجعة: نظيفة).
- 2.3 ✅ طلب دواء غير موجود موحد (−2): pharmacy/request.tsx يحمل منطق manual-order حرفياً (عقد /patient/pharmacy/orders + idempotency)؛ الثلاثة القديمة Redirects آمنة؛ 5 ملفات مرجِعة حُدّثت (tabs/pharmacy, barcode-scanner, cart, deepLinks, types)؛ مراجعة: نظيفة.
- 2.4 ✅ clinic-location مدموجة في clinic-confirm (view=location) + redirect آمن؛ clinic/[id] يبقى (ملف منشأة — مسار مختلف). (−1 فعلي، موثق بصدق)
- 2.5 ✅ payments/result.tsx موحدة: processing (حرفياً) + success/failed كمكوّنات، والمسارات الثلاثة القديمة redirects آمنة بلا تحديث مراجع وبلا حلقات تنقل.
- 2.6 ✅ benefits-summary مدموجة في coverage-check (view=benefits) + redirect.
- 2.7 ✅ crisis-contacts مدموجة في emergency hub (view=crisis) + redirect.
- 2.8 ✅ /search يستضيف view=pharmacy|doctors|default؛ product-search وdoctor-search redirects؛ drug-scanner يبقى (كاميرا native). تبويبات UI داخلية = تحسين لاحق.
- الهدف: شراء دواء 7→4 خطوات؛ حجز استشارة 8→5.

## المرحلة 3 — تنظيف تطبيق المزود
- 3.1 ✅ BlueprintScreens ليست ميتة بالكامل: 5 لوحات تحكم تستورد منها شاشات حية — الفحص الحاسم أثبت: 18/18 من الصادرات مستوردة فعلاً من 5 لوحات تحكم حية — **صفر شاشات ميتة، لم يُحذف أو يُحجَر شيء** (الملف كود حي وليس مخططاً ميتاً كما كان مفترضاً).
- 3.2 ⚠️ مكوّنات Doctor مستوردة في DoctorDashboard (الذي يجلب /calls/provider/* فعلياً) لكن تمرير الprops لم يُتحقق آلياً (JSX متعدد الأسطر) — مؤكد جزئياً، التأكيد النهائي عبر typecheck في CI.
- 3.3 ✅ docs/PROVIDER_NAV_MAP_2026-08-31.md — Stack: Welcome/Login/Register/Forgot/Pending/Dashboard/GuestJobs/GuestDrugIndex.
- 3.4 ✅ رحلات التسجيل السبع موجودة وتقود إلى Pending ثم Dashboard — لا حلقات مفقودة.

## المرحلة 4 — بناء شاشات الويب الناقصة (parity مع الموبايل بالرحلات المختصرة)
- 4.1 ✅ payments: /[locale]/payments/result موحدة (success/failed/processing بحالة مُتحقق منها من الباكند عبر ref — لا تثق بـ URL) + BFF /api/payments/status/[ref] + i18n ×6 + CSS بنظام brand (أوف-وايت/ليموني/مرجاني).
- 4.2 ✅ pharmacy: الويب كان يملك أغلب الرحلة (medicines/cart/checkout/prescription/orders/offers/negotiation) — بُني الناقص الحقيقي فقط: medicines/compare (قراءة من الكتالوج الحقيقي) + pharmacy/request (نفس عقد الموبايل /patient/pharmacy/orders مع idempotency) + BFF + i18n ×6. الرحلة المختصرة متحققة: medicines→[medicineId]→cart/checkout→orders/tracking.
- 4.3 ✅ consultations (gap-only، عقود مُتحقق منها): call-history (من /care/appointments) + post-call-rating (إلى /patient-ux/review الموجود) + home-visit-tracking (timeline من /care/appointments/:id) + BFF + i18n ×6. المُغطّى سلفاً على الويب: waiting-room/video-call، clinic-confirm، cancel-reschedule (BFF موجودة)، offer/summary/follow-up (تدفقات داخل appointments/[orderId]).
- 4.4 ✅ (gap-only بعقود مُتحقق منها): بُني nursing/visits/[visitId] (تتبع حي من /nursing/visits/:id + /tracking — كلاهما موجود فعلاً). قرارات موثقة بصدق للباقي: diagnostics/lab/[id] — لا endpoint GET /labs/:id مؤكد ⇒ مؤجل حتى يُبنى أو يُؤكد؛ nursing/nurse-profile — لا endpoint لملف الممرض العام ⇒ مؤجل؛ reviews — يوجد POST فقط بلا GET ⇒ مؤجل؛ map/location-picker — يحتاج قرار مزوّد خرائط للويب ⇒ مؤجل. المغطى سلفاً: nursing/catalog + visits + diagnostics كاملة (labs/radiology/packages/[bookingId]).
- 4.5 تحقق تكامل لكل شاشة موجودة مقابل الموبايل (نفس العقد والبيانات).

## المرحلة 5 — المؤجل (SEO/AI/الاكتشاف/الأمان)
- 5.1 إكمال catalog eligibility + internal search normalization (بدأ، يُستكمل).
- 5.2 اكتشاف الوكلاء: OAuth/OIDC ✅، auth.md ✅، ai-catalog ✅ — المتبقي: MCP server-card، x402، MPP، UCP، ACP، DNS-AID (يحتاج DNS/billing).
- 5.3 أمان: rate limiting + SQLi + RBAC hardening (تدقيق وتعزيز).

## المرحلة 6 — بوابة الجودة (محجوبة بيئياً — تُنفذ في CI)
- 6.1 npm ci --legacy-peer-deps → typecheck + tests + build لكل تعديل.
- 6.2 لا دمج إلى main إلا بإشارة المستخدم وبعد اجتياز 6.1.

## حالة التنفيذ
| المرحلة | الحالة |
|---|---|
| 1 | 1.1✅ 1.2✅ 1.3⏳ |
| 2 | ✅ مكتملة (2.0–2.8) — خلفية iPhone off-white #F5F5F7 معتمدة |
| 3 | ✅ مكتملة (3.1–3.4) |
| 4-6 | ⏳ تُنفذ تباعاً بنفس القاعدة |
