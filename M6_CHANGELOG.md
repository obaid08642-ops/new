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

---

# الدفعة الثانية (24/07) — ER-8 الإشعارات + ER-9 الاتصالات + ER-11 أمن

## 1) ER-8 — بنية تسليم الإشعارات (الفجوات كانت: لا retry، لا جدولة، لا حالة تسليم، لا عقد شاشة في الحمولة)
- **مخطط Notification:** حقول `delivery` (حالة لكل قناة: SENT/FAILED + attempts + last_error + sent_at) · `scheduled_at` · `status` (PENDING/SCHEDULED/SENT/PARTIAL/FAILED مفهرس).
- **طابور BullMQ `notifications-delivery`** + `NotificationDeliveryProcessor`: إعادة محاولة ×4 بتراجع أسّي (30ث) · جدولة عبر delay · `removeOnComplete/Fail` · **fallback تسليم مباشر** إن تعذر الاتصال بـ Redis (لا ينكسر إنشاء الإشعار).
- **`deliverById`:** تسجيل حالة لكل قناة (push/sms/whatsapp/email) وحساب الحالة الكلية؛ رمي خطأ عند فشل كل القنوات ← يفعّل إعادة المحاولة.
- **`sendPush` مُعاد:** حمولة العقد `data={type, screen, params, action}` (يقرأها NotificationHandler في التطبيق من دفعة 1) + **توجيه الرموز حسب نوعها**: Expo (`ExponentPushToken` ← exp.host API) وFCM (multicast/topic) — كل منهما يُرجع نجاحًا فعليًا.
- **مسارات أدمن جديدة:** `POST /notifications/admin/schedule` · `GET /notifications/admin/delivery-stats`.

## 2) ER-9 — جرد الاتصالات: الموجود مسبقًا غطّى معظم البنود
LiveKit ✓ · Coturn ببيانات مؤقتة ✓ · Socket.IO ✓ · JWT للمكالمات ✓ · Presence ✓ · typing ✓ · مرفقات/صوتيات (type: text/image/voice/file) ✓ · unread counters ✓.
**الفجوة المسدودة:** إيصالات قراءة لحظية — حدث `mark_seen` → بث `message_seen` للطرف الآخر في `chat.gateway`.

## 3) ER-11 — ثغرتان أمنيتان في بوابة Socket (حقيقيتان)
- **انتحال الهوية:** كان `userId` يُؤخذ من handshake دون أي تحقق ← الآن **JWT إلزامي** (`auth.token` أو Authorization header) مع fallback للتطوير فقط. تطبيق المريض يرسل التوكن مسبقًا ✓.
- **CORS:** كان `origin: '*'` ← قائمة ALLOWED_ORIGINS البيئية (نفس سياسة HTTP).

## 4) التحقق والتسليم
backend `tsc --noEmit` = 0 (على نسخة بناء /tmp بعد إعادة تثبيت الحزم) · زيب backend محدث · دفع على نفس فرع `m6-seo-enterprise`.
**متبقي M6:** ER-10 أداء · ER-5 i18n المحتوى · ZATCA/نفاذ · BR-6 واجهات · SEO-2 · إحصاء التسليم في واجهة الأدمن.

---

# الدفعة الثالثة (24/07) — BR-6 i18n + ZATCA + ER-10 فهارس

## 1) BR-6/ER-5 — توحيد مصدر الترجمة (كان نظامان متوازيان!)
- الجرد كشف: `i18n/index.ts` يحوي القاموس الكامل الحقيقي (6 لغات: ar/en/ur/hi/bn/fil مع fallback عربي + autoTranslate لمحتوى الـ API) بينما `LanguageManager` (i18n-js) يقرأ 6 ملفات JSON شبه فارغة (252 بايت!) — مصدران متباعدان.
- **الإصلاح:** LanguageManager أصبح يقرأ نفس القاموس المضمّن (مصدر واحد) · تصدير `translations` من index.ts · مبدّل اللغة في الإعدادات يعمل مسبقًا ✓ · RTL لـ ar/ur ✓.
- **دين مسجل:** ترجمة النصوص الثابتة داخل الشاشات (t() rollout) مهمة ممتدة M7 — المعيار: لا نص ثابت جديد (BR-8).

## 2) ZATCA المرحلة 1 — فوترة إلكترونية مبسطة (موديول billing جديد)
- مخطط `EInvoice` (رقم تسلسلي سنوي INV-YYYY-NNNNNN عبر عداد ذري) + خدمة + مسارات:
  - `GET /billing/invoice/:kind/:bookingId` — إصدار/استرجاع فاتورة لحجز مدفوع (ملكية أو أدمن) — يدعم order/appointment/lab/radiology/home_care.
  - `GET /billing/my` · `GET /billing/admin/list` (أدمن).
- **QR متوافق ZATCA**: TLV (tags 1–5: اسم البائع/الرقم الضريبي/التاريخ/الإجمالي/الضريبة) base64 · استخراج VAT 15% من الإجمالي الشامل · بيانات البائع من env (`ZATCA_SELLER_NAME`/`ZATCA_VAT_NUMBER`).
- **دين مسجل:** المرحلة 2 (Fatoora clearance · UBL XML · توقيع تشفيري) تتطلب حلًا معتمدًا — مسار شهادة منفصل.
- النماذج المشتركة تُجلب من اتصال mongoose المشترك (لا إعادة تسجيل — يتجنب OverwriteModelError).

## 3) ER-10 — فهارس المسارات الساخنة
- الجرد: معظم الفهارس موجودة (order/notification/insurance/slot-uniqueness). **أُضيف:** `Appointment {patient_id:1, slot_start:-1}` (مواعيدي الأحدث) و`{doctor_id:1, status:1, slot_start:-1}` (جدول المزود).

## 4) التحقق والتسليم
backend tsc=0 · patient tsc=0 · زيبات backend+patient محدثة · دفع على فرع `m6-seo-enterprise`.
**متبقي M6:** ER-10 المتبقي (تحليل استعلامات N+1) · SEO-2 · توسعة i18n للمحتوى في الباك إند (name_ar/en معمم) · نفاذ/Nafath SSO (تقييم).

---

# الدفعة الرابعة (24/07) — SEO-2 المقالات + تقييم نفاذ + استرجاع مفقود M3

## 1) SEO-2 — منصة المقالات الصحية (ER-2)
- **مخطط `Article` جديد:** عنوان/مقتطف/نص (ar+en) · فئة · وسوم · غلاف · مؤلف · حالة DRAFT/PUBLISHED · slug فريد · seo_description override · عدّاد مشاهدات · فهرس مركب (status+published_at).
- **موديول `articles`:** عام — `GET /articles` (منشورة فقط + بحث/فئة/تصفح) · `/articles/categories` · `/articles/:slug` (+views) · أدمن CMS — `GET/POST /admin/articles` · PATCH · publish/unpublish · حذف ناعم (Roles ADMIN).
- **دمج كامل في SEO:** نوع `article` في resolve (منشورة فقط) + meta + JSON-LD `Article` (headline/datePublished/author) + **sitemap.xml** (أولوية 0.6/أسبوعي) + مشاركة deep link.
- **الويب:** عرض المقال في `/s/article/:slug` (غلاف/فئة/نص/مؤلف/تاريخ) + دليل `/articles` (SSR) + بطاقة في الرئيسية + robots.txt.
- **زرع 3 مقالات بداية** (قلب/تغذية أطفال/سكري) — `scripts/seed-articles.ts` ← القسم يعمل E2E فورًا.

## 2) استرجاع مفقود: سكربت شركات التأمين (M3)
اكتُشف أن `scripts/seed-insurance-companies.ts` فُقد من مساحة العمل قبل تغليف M3 — **أُعيد إنشاؤه** (10 شركات سعودية، upsert idempotent). درس مكرر: التحقق بالحجم قبل كل تسليم مطبق الآن.

## 3) تقييم نفاذ/Nafath — موثق في السياق (§4ج-2)
ليس OIDC قياسيًا — بروتوكول DGA خاص (request/random/موافقة بيومترية/status webhook) ويتطلب اعتماد كيان رسمي. **القرار:** التصميم جاهز (موديول nafath: KYC مزودين + توثيق مرضى) — التنفيذ عند الحصول على الاعتماد (بند M8 خارجي).

## 4) التحقق والتسليم
backend tsc=0 · admin tsc=0 + next build ✓ (`/articles` SSR ظاهرة في الإخراج) · زيبات backend+admin محدثة · فرع `m6-seo-enterprise`.
**M6 مغلقة.** المتبقي موثق: تحليل N+1 (M7) · i18n محتوى الباك إند المعمم (M7) · نفاذ (اعتماد خارجي) · ZATCA-2 (اعتماد خارجي) · إحصاء التسليم UI.
