# سجل تغييرات المرحلة M5 — صفحات الأدمن التشغيلية

**التاريخ:** 2026-07-24 · **الفرع:** `m5-admin-pages` (مبني على `m4-extended-flows`)
**التحقق:** backend `tsc --noEmit` = 0 · web-admin `tsc` = 0 · **Next.js build ✓** (20 صفحة تُبنى بنجاح).

---

## 1) الباك إند — 3 إصلاحات تكامل/أمن

1. **دمج طابور السحوبات (فجوة تكامل حقيقية):** سحوبات المزود من M2 تُكتب في مجموعة `ProviderWithdrawal` (state `PENDING_ADMIN_APPROVAL`) بينما صفحة الأدمن كانت تقرأ `WithdrawalRequest` القديمة فقط — أي **طلبات السحب الحقيقية كانت غير مرئية للأدمن**.
   - `admin-web-core/controllers/finance.controller.ts` أُعيد كتابته: `GET /admin/finance/withdrawals/pending` يدمج المجموعتين بشكل موحد (`source: legacy|provider_ops`) · `POST /:id/execute` يتعامل مع المصدرين (ProviderWithdrawal ← `PAID`) · **جديد** `POST /:id/reject` (مع سبب).
   - تسجيل `ProviderWithdrawalSchema` في `AdminWebCoreModule`.
2. **إشراف التأمين الإداري (جديد):** `AdminInsuranceController` ← `GET /admin/insurance/requests?state=` (كل الطلبات عبر المزودين) + `GET /admin/insurance/stats` (عدّادات ومجاميع حسب الحالة) — خدمتا `adminAll/adminStats` في `InsuranceFlowService`.
3. **تحصين مسارات الدعم الإدارية:** `GET/PATCH /support/admin/*` كانت مفتوحة لأي مستخدم موثّق (تعليق "should be admin in future") ← أصبحت `@Roles(UserRole.ADMIN)`.

## 2) لوحة الأدمن (web-admin) — 5 صفحات جديدة + إعادة هيكلة التنقل

**إصلاح معماري:** `AdminGuard` (يغلف كل /admin/* مركزيًا عبر `_app.tsx`) كان فيه sidebar من 7 روابط فقط، وثلاث صفحات كانت تغلف نفسها بنفسها (sidebar مزدوج). الآن: **قائمة موحدة بـ 16 صفحة في 4 أقسام** (قيادة ومراقبة · مالية · تشغيل · نظام) + زر خروج، وأُزيل التغليف المكرر من audit-logs/disputes، وأُصلح JSX المكسور الناتج (TS2657).

**الصفحات الجديدة:**
| الصفحة | المسارات المربوطة | الوظيفة |
|---|---|---|
| `sos-monitor.tsx` | `GET /emergency/active` (استطلاع 10ث) · `POST /:id/assign` · `POST /:id/resolve` | مراقبة SOS حية: عدّاد نشط نابض، موقع المريض على الخريطة، إسناد مستشفى، إنهاء بملاحظات |
| `insurance-queue.tsx` | `GET /admin/insurance/stats` · `requests?state=` · `GET /admin/finance/refunds/queue` · `POST refunds/:id/decide` | بطاقات إحصائية قابلة للفلترة + جدول كل الطلبات + طابور المستردات باعتماد/رفض |
| `commissions.tsx` | `GET /admin/finance/ledger/summary` · `GET /admin/finance/commissions` | مؤشرات (إجمالي العمولة/Gross/المتوسط الفعلي) + تفصيل حسب نوع الخدمة بنسب BR + السجل الخام |
| `support-tickets.tsx` | `GET /support/admin/requests` · `PATCH /:id` · `POST /requests/:id/reply` | فلاتر حالة + محادثة thread + رد دعم + انتقالات حالة |
| `rbac.tsx` (BR-7) | مرآة `common/permissions.ts` | مصفوفة 15 دورًا × 27 صلاحية تفاعلية (فلترة دور/مجال) + توثيق آلية الفرض الخادمية |

**المحدَّثة:** `payouts.tsx` — زر رفض بسبب + عمود المصدر (legacy/تطبيق المزود) + قراءة الطابور الموحد.

## 3) بقايا M5 المؤجلة (موثقة في PROJECT_CONTEXT)
صفحات §7 الأقل أولوية: Feature Flags UI (المسارات موجودة admin/feature-flags) · الكوبونات/CMS البنرات · Broadcast · القائمة السوداء · إدارة الترجمات (BR-6، مع M6) · إدارة الصيدليات/المعامل/الأشعة (اعتماد+كتالوج — جزء منه في provider-moderation) · خريطة الطلبات الحية (Heatmap موجود جزئيًا في dashboard) · تعديل الأدوار ديناميكيًا (M6).

## 4) التسليم
زيبات محدثة: `nabdah-backend.zip` · `Napd-admin.zip` + فرع `m5-admin-pages` + تحديث PROJECT_CONTEXT.
