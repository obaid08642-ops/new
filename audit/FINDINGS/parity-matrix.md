# مصفوفة التكافؤ ويب ↔ موبايل (P6-c — من الفحص المباشر)
> MATCH = موجود ومتكافئ · GAP = مفقود في جهة · DIVERGED = موجود بسلوك مختلف.
> التفصيل الكامل في سجل المحادثة (P6-c).

## محلولة في P6 ✅
- دفع الصيدلية (ويب): بُنيت صفحة + BFF (capabilities/intent) مطابقة للموبايل
- حجز الاستشارات (ويب): نقدي للعيادة فقط + موقع منزلي + تحويل تأمين + lock
- الضيف (ويب): جلسة حقيقية + تحويل بلا فقدان (مطابقة الموبايل)
- 404 بكل اللغات الست + RTL صحيح (ur)

## فجوات موبايل (الويب يملكها) — الحالة بعد التنفيذ
1. ✅ محفظة المريض — بُنيت (P6-D)
2. ✅ حجز التمريض — بُني العقد + القائمة + الربط (P6-D)
3. ✅ كتالوج الأشعة — **تبين أنه موجود** (تبويب radiology + test-detail يدعمه) — لا عمل
4. ⬜ دليل الصيدليات/حجز مختبر SEO — طبيعة ويب (استكشاف)، الموبايل لديه بحث — مقبول
5. ⬜ تفاعلات الأدوية/تفاصيل طلب التأمين/لوحة صحة — backlog تصميمي (P6-D لاحق)
6. ⬜ مكالمة واردة ويب — محدودية منصة (إشعار بدل واجهة) — مقبول وموثق

## فجوات ويب (الموبايل يملكها) — تُبنى في P6-D
1. شات الصيدلي التفاوضي (endpoints pharmacy/chat موجودة)
2. входя المكالمة (محدودية منصة — إشعار بدلاً من واجهة)
3. عرض وصفة الطبيب (بيانات prescriptions/active موجودة)
4. hub المحفظة/الطلبات/النتائج بأسماء موحدة (توحيد تسميات فقط)

## تباينات مقبولة (موثقة، لا عمل)
- الجلسات: SecureStore+Redux مقابل httpOnly+SSR (تصميم منصات)
- الضيف: مربوط بالجهاز في الجهتين (توحد الآن)
- SEO city layers (ويب فقط — طبيعة الويب)

---

## إعادة الجرد الكاملة — الخطوة 3 (2026-09-12، من الكود الفعلي)
> المصدر: `find patient-web/app -name page.tsx` = **272** مقابل `find patient-app/app+src/screens -name *.tsx` = **254**.
> ملاحظة منهجية: أسماء `hub/index` في expo-router غالباً مداخل تنقل لا مزايا — تُذكر ولا تُعامل كفجوة وظيفية إلا بعد فحص سلوكي.

### جدول التغطية حسب المنطقة (موبايل → ويب)

| المنطقة | موبايل | ويب | الحكم |
|---|---|---|---|
| consultations | 28 | 26 | GAP جزئي (3 شاشات بلا مقابل — أدناه) |
| health | 26 | 19 | GAP جزئي (مقابلات بأسماء مختلفة — أدناه) |
| pharmacy | 24 | 19 | MATCH وظيفياً (الفروق بأسماء/مسارات مكافئة — أدناه) |
| diagnostics | 20 | 24 | ويب أوسع ✅ |
| nutrition | 13 | 12 | MATCH (مقابلات مباشرة) |
| insurance | 13 | 13 | MATCH ✅ |
| settings | 12 | 8 | GAP جزئي (2–3 شاشات — أدناه) |
| family | 12 | 9 | GAP جزئي (مقابلات + 3–4 مرشحة — أدناه) |
| mental-health | 8 | 7 | MATCH (مقابلات بأسماء مختلفة) |
| nursing | 6 | 8 | ويب أوسع ✅ |
| maternity/loyalty/profile/payments/emergency/returns/articles/support/offers/wallet | ≤6 | ≥ مثله | MATCH ✅ |
| wearables/voice/search/map/drug-scanner/reviews/programs/medicine/compare/doctors | موجودة | موجودة | MATCH ✅ |

### مقابلات مُغلقة (كانت تبدو فجوات — تبين لها مكافئ)
- `cart/checkout` ← `cart/` + `cart/checkout` · `order-history/tracking` ← `orders/` + `orders/[orderId]/tracking`
- `product-detail` ← `pharmacy/[slug]` · `medicine-compare` ← `medicines/compare`
- `pharmacist-chat` ← `pharmacy/chat` · `chat-with-doctor` ← `consultations/chat`
- `doctor-search` ← `doctors/[specialty]/[city]` (أغنى) · `prescription-from-doctor` ← `consultations/prescription`
- `family-member-detail` ← `family/[memberRef]` · `nutrition-plan` ← `nutrition/plan`
- `view-report` ← `reports/[reportId]` · `delivery/address-select` متطابق
- `edit-profile` ← `profile` · `drug-not-found/filters/final-quote/insurance-decision/manual-order/order-confirm/payment/reorder/request/rx-order/scan-prescription/waiting-for-pharmacy` كلها متطابقة اسمياً

### فجوات ويب صلبة متبقية (شاشة موبايل بلا مقابل ويب)
1. `consultations/appointment-detail` — تفاصيل موعد مفرد (القائمة `appointments` موجودة)
2. `consultations/incoming-call` — مقبولة سابقاً (محدودية منصة، إشعار بدل واجهة)
3. `consultations/summary` — ملخص ما بعد الاستشارة
4. `settings/notifications-settings` — إعدادات إشعارات مفصلة (`settings/notifications` موجودة — تحقق: دمج أم نقص؟)
5. `settings/privacy` — صفحة خصوصية التطبيق
6. `family/emergency-contacts` — جهات طوارئ العائلة
7. `family/hub` + `health/family-hub` — (مرجح مدخل تنقل — تحقق سلوكي)
8. `family/member-health` — صحة فرد مفرد (مقابل `[memberRef]`؟ — تحقق)
9. `family/shared-calendar` — (مقابل `family/calendar`؟ — تحقق)
10. `health/medication-reminder-add` — (مقابل `reminders/add`؟ — تحقق)
11. `health/sleep-score` + `sleep-tracker` — (مقابل `health/sleep` المفردة — تحقق: دمج أم نقص؟)
12. `nutrition/hub` + `mental-health/hub` + `reports/hub` + `reports/timeline` — (مرجح مداخل تنقل — تحقق)
13. `pharmacy/product-search` — (مقابل `search`/`medicines`؟ — تحقق)

### الخلاصة الصادقة للخطوة 3
- الويب **ليس ناقصاً جداً**: 272 مساراً مقابل 254 شاشة، وMATCH في معظم المناطق، ومتفوق في (diagnostics/nursing/doctors/labs).
- الفجوة الحقيقية: **~5 مؤكدة** (3,5,6 + 4/11 بعد التحقق) + **~8 تحتاج تحققاً سلوكياً** (مقابل-محتمل مقابل نقص فعلي).
- الخطوة التالية (4): بناء المؤكد + حسم المشكوك بفحص سلوكي (DIVERGED أم GAP) قبل البناء.

### ما بُني في الخطوة 4 (2026-09-12)
- ✅ `family/emergency-contacts` صفحة جديدة (GET /family/emergency-contacts + tel: + دعوة + SOS) — كانت فجوة مؤكدة #6
- ✅ `settings/privacy` صفحة جديدة + BFF `app/api/settings/privacy` (GET/PATCH) + `PrivacyToggles` — كانت فجوة مؤكدة #5
- ✅ `reports/timeline` صفحة جديدة (GET /medical-reports/timeline + فلتر بالنوع) — كانت مرشحة، تبينت فجوة حقيقية
- ✅ توسيع `appointments/[id]/summary`: التوصيات + بطاقة المتابعة (follow_up + نافذة الخصم) + رابط التقييم — كان PARTIAL
- ✅ حُسمت كمغطاة (لا بناء): `member-health` ← `[memberRef]` (member-records كاملة) · `shared-calendar`/`product-search` (تحويلات في الموبايل نفسه) · `nutrition/mental-health/family` hubs ← صفحات الفهرس الويب (لوحات حقيقية) · `sleep-score/tracker` ← `health/sleep` · `reminders/add` ← يغطي تذكير الأدوية · `therapist-match` موجودة · `appointment-detail` ← صفحة التفاصيل الويب (إلغاء/تأجيل/دفع/تأمين/ملخص)
- ⬜ DIVERGED موثق (لا بناء): `notifications-settings` — الويب عرض فقط عمداً (قرار P6: التغيير من الموبايل)؛ `incoming-call` — محدودية منصة
