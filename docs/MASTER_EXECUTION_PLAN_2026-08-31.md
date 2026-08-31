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
- 2.4 صفحة عيادة واحدة (−2): clinic/[id]+location+confirm.
- 2.5 نتيجة دفع موحدة (−2): processing+success+failed → شاشة واحدة تقرأ API.
- 2.6 بطاقة تأمين موحدة (−1): coverage-check + benefits-summary.
- 2.7 مركز طوارئ موحد (−1): emergency + mental-health/crisis-contacts.
- 2.8 بحث عالمي موحد (−2): search + product-search + doctor-search (+ drug-scanner رفع صورة).
- الهدف: شراء دواء 7→4 خطوات؛ حجز استشارة 8→5.

## المرحلة 3 — تنظيف تطبيق المزود
- 3.1 حذف BlueprintScreens.tsx الميتة بعد التأكد أن RealScreens بدّلتها.
- 3.2 ربط/توثيق شاشات بلا شبكة (ProviderHome, Doctor* components).
- 3.3 خريطة تنقّل موثقة لـ Navigator.
- 3.4 سد حلقات رحلة التسجيل لكل تخصص → PendingDashboard → تفعيل.

## المرحلة 4 — بناء شاشات الويب الناقصة (parity مع الموبايل بالرحلات المختصرة)
- 4.1 payments (3) — بشاشة نتيجة موحدة.
- 4.2 pharmacy (~10) — بالرحلة المختصرة (بحث→منتج→checkout موحد→تتبع).
- 4.3 consultations (~8) — بشاشة الحالة الموحدة لا الثلاث.
- 4.4 nursing/diagnostics/متفرقات (~6).
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
| 2-6 | ⏳ تُنفذ تباعاً بنفس القاعدة |
