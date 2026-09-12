# تحسين الرحلات — إضافة 18 (قياس + مقترحات ضغط قبل/بعد)
> قياس من الكود الفعلي (2026-09-12). القاعدة: صغير = مباشر · كبير = مقترح + اعتماد المالك، بلا كسر منطق.
> **كل ما أدناه مقترحات — لم يُنفذ أي كود دمج.** التنفيذ بعد اعتمادك.

## J1 — طلب صيدلية (وصفة/يدوي): 9 خطوات أساسية ← 24 شاشة في المجلد
**قبل:** `scan-prescription` → `request`/`manual-order` → `waiting-for-pharmacy` → `broadcast-status`
→ `final-quote` → `insurance-decision` → `payment` → `order-confirm` → `order-tracking`
(فروع: `pharmacist-chat`، `drug-not-found`، `reorder`)
**بعد (مقترح كبير):** `scan/request` (تبويبات نمط) → `broadcast-live` (دمج الانتظار+الحالة — نفس الـ state) →
`final-quote` → `insurance-decision` → `payment` → `order-tracking` (التأكيد = الحالة 0)
= **6 خطوات**. الفروع تبقى. التوفير: 3 شاشات مدمجة، نفس العقود والـ API.

## J2 — حجز استشارة: 9 خطوات ← ~30 شاشة في المجلد
**قبل:** بحث (`doctors`/`doctor-search`/`specialty-select`) → `doctor-profile` → `book` →
`booking-confirm` → `booking-status`/`booking-pending` → دفع → `video-call`/`waiting-room`
→ `summary` → `post-call-rating`
**بعد (مقترح كبير):** بحث موحد بفلاتر (الويب أغنى أصلاً) → `doctor-profile` → `book` →
`booking-status` (تستوعب confirm+pending كحالات) → دفع → `video-call` → `summary` → تقييم
= **6–7 خطوات**. التوفير: شاشتا حالة + شاشتا بحث.

## J3 — تشخيص (مختبر/أشعة): 8 خطوات ← ~20 شاشة
**قبل:** بحث/باقات/تفاصيل → `book` → `insurance-upload`/`approval` → دفع → `booking-confirm`/`success`
→ `sample-tracking`/`technician-tracking` → `my-results`/`results-history`
**بعد (مقترح كبير):** → `book` → تأمين → دفع → `booking-status` (تستوعب confirm+success) →
`tracking` (عينة+فني بتبويبات) → `results` (نتائج+سجل بتبويبات) = **5–6 خطوات**.

## J4 — تمريض: 4–5 خطوات (service-details → حجز → visits → live-tracking)
**الحكم: نحيفة أصلاً — لا تغيير مقترح.** تُترك كما هي.

## J5 — التأمين (عرضي): profile → طلب → قرار مزود → إشعار → دفع تحمل
**الحكم: مربوط بمواصفة §5 المعتمدة — لا ضغط دون تغيير المواصفة.** لا مقترح.

## ملخص الاعتماد المطلوب من المالك
| المقترح | الحجم | الأثر |
|---|---|---|
| دمج J1 (3 شاشات) | كبير | يحتاج اعتماد — يمس حالات البث |
| دمج J2 (3–4 شاشات) | كبير | يحتاج اعتماد — يمس مسار الدفع |
| دمج J3 (2–3 شاشات) | كبير | يحتاج اعتماد — يمس التتبع |
| J4/J5 | — | بلا تغيير |

**التوصية التنفيذية:** اعتماد J1+J3 أولاً (أقل خطراً — لا تمس الدفع)، ثم J2. التنفيذ لاحقاً برزم صغيرة مع regression لكل رحلة (إضافة 20).
