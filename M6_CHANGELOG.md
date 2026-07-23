# سجل تغييرات المرحلة M6 (الدفعة الأولى) — التوجيهات المؤسسية ER + SEO/GEO + Deep Linking

**التاريخ:** 2026-07-24 · **الفرع:** `m6-seo-enterprise` (مبني على `m5-admin-pages`)
**التحقق:** backend tsc=0 · admin tsc=0 + **next build ✓** (صفحات SSR الجديدة ƒ) · patient tsc=0.

> مُنشأ بطلب المالك: مستند "Additional Enterprise Requirements (ER-1..ER-13)" — سُجّل كاملًا في PROJECT_CONTEXT §4ج مع تعيين كل بند لمرحلته. تقييم NPHIES (ER-6/ER-7) موثق بمصادر رسمية (portal.nphies.sa · chi.gov.sa): **يبقى التدفق اليدوي من المزود (BR-2) هو المعتمد**؛ لا API عام لتحقق المريض الذاتي؛ HIDP-API للمزودين المنضمين فقط — والتكامل المباشر مسار شهادة HIS منفصل غير مطلوب للسوق.

---

## 1) اكتشاف: بنية SEO موجودة مسبقًا في الباك إند (modules/seo)
خدمة كاملة: resolve/meta/buildShareLink/sitemap/robots/IndexNow لخمسة أنواع كيانات + slugs حتمية (common/slug.util.ts). **الفجوة الحقيقية كانت غياب الواجهة العامة** التي تقدّم هذه الروابط — وهذا ما بُني في هذه الدفعة.

## 2) الباك إند
- **إصلاح `robots()`:** مسار sitemap كان `/api/v2/...` ← `/api/v1/seo/sitemap.xml` (البنية: prefix `api` + URI version 1).
- **ER-4 — قاعدة المعرفة الدوائية:** توسعة `medicine.schema.ts` بـ 18 حقلًا: generic_name (نصي مفهرس) · images[] · indications_ar/en[] · usage_instructions_ar/en · pregnancy/breastfeeding_info_ar/en · storage_conditions_ar/en · alternatives[] (مفهرسة) · related_product_ids[] · sub_category · categories[] · seo_description_ar/en (تجاوز يدوي للميتا).
- **Deep links:** `buildShareLink` ← `nabdplus://s/:type/:slug` (موحّد مع scheme التطبيق وملتقط الروابط الجديد).

## 3) الويب العام (web-admin — قرار: نفس تطبيق Next.js يخدم العام والإدارة، موثق في السياق)
- **`src/pages/s/[type]/[slug].tsx` (SSR):** صفحة كيان عامة كاملة — title/description/canonical/OG/Twitter من خدمة SEO + **JSON-LD** (Drug/Physician/MedicalTest/MedicalProcedure) + عرض قاعدة المعرفة الدوائية كاملة (تركيب/دواعي/جرعة/موانع/تحذيرات/آثار/تداخلات/حمل ورضاعة/تخزين/بدائل/صور) + breadcrumb + CTA «فتح في التطبيق» + كاش `s-maxage=300`.
- **5 صفحات أدلة SSR:** `/doctors` · `/medicines` · `/facilities` · `/lab-services` · `/home-care-services` (بحث فوري + روابط داخلية لكل كيان) عبر `PublicDirectory` المشترك.
- **الرئيسية `/`:** كانت redirect للأدمن ← صفحة هبوط عامة قابلة للفهرسة مع JSON-LD (MedicalOrganization) وروابط لكل الأدلة.
- **`public/robots.txt`:** السماح للأدلة و`/s/` + منع `/admin` + إشارة للـ sitemap.
- نتيجة: أي كيان يُضاف لقاعدة البيانات يحصل تلقائيًا على صفحة مفهرسة (ER-3) — بلا أي عمل يدوي.

## 4) تطبيق المريض (ER-8/ER-12)
- **إعادة كتابة `NotificationHandler`:** عقد موحّد `data.screen + data.params` (مع whitelist لمنع التنقل غير الآمن) + أنواع قديمة موسّعة (booking_accepted←booking-pending · insurance_decision/copay_due · report_ready · emergency_update · refund_status) + **fallback آمن لمركز الإشعارات** — كل إشعار يفتح شاشته الصحيحة حتى من حالة الإغلاق.
- **ملتقط الروابط العامة `app/s/[type]/[slug].tsx`:** الروابط المفهرسة/المشاركة/QR تفتح داخل التطبيق عبر `/seo/resolve` ← تحويل لشاشة الكيان (دواء/طبيب/منشأة/خدمة) مع fallback بحث.
- (app.json يحوي مسبقًا scheme nabdplus + associatedDomains + intentFilters — موثق أن ملف AASA/assetlinks مطلوب على النطاق عند النشر — سُجّل في السياق.)

## 5) المتبقي من M6 (الدفعات القادمة — مسجل في السياق)
ER-8 backend: Retry Queue + مجدولة + حالة تسليم · ER-9: جرد الاتصالات (TURN/presence/typing/read receipts) · ER-10/11: تدقيق الأداء والأمن الشامل · ER-5: تعميم حقول i18n للمحتوى · ZATCA/نفاذ · i18n الواجهات (BR-6) · SEO-2: مقالات + كيانات إضافية (صيدليات/معامل كأنواع مستقلة).

## 6) التسليم
زيبات محدثة: backend · Napd-admin · nabd_plus + فرع `m6-seo-enterprise` + تحديث PROJECT_CONTEXT.
