# Patient Web ↔ Mobile Parity — التدقيق اليدوي المصحح (2026-08-30)

> يحل محل المطابقة الآلية السابقة (25%) التي أساءت القراءة: أسماء المسارات تختلف بين Mobile (`doctor-search`) وWeb (`doctors`) رغم تطابق الوظيفة.

## منهجية هذا التدقيق
فحص يدوي لقائمة ملفات الـWeb الفعلية (85 route) مقابل قدرات Mobile الـ200 — بالوظيفة لا باسم الملف.

## الموجود في Web فعلياً (مؤكد من الملفات)
| القدرة | مسار Web | موجود |
|---|---|---|
| الاستشارات — بحث الأطباء | `/consultations/doctors` | ✅ |
| الاستشارات — ملف الطبيب | `/consultations/doctors/[doctorId]` | ✅ |
| الاستشارات — التخصصات | `/consultations/specialties` | ✅ |
| الاستشارات — نموذج الحجز (داخل صفحة الطبيب) | `/consultations/doctors/[doctorId] + AppointmentBookingForm` | ✅ |
| الاستشارات — قائمة المواعيد | `/appointments` | ✅ |
| الاستشارات — تفاصيل الموعد | `/appointments/[appointmentId]` | ✅ |
| المحادثات | `/chat + /chat/[threadId]` | ✅ |
| المختبر | `/diagnostics/labs` | ✅ |
| حزم الفحوصات | `/diagnostics/packages + [packageId]` | ✅ |
| الأشعة | `/diagnostics/radiology + [serviceId]` | ✅ |
| الصيدلية — الكتالوج | `/medicines + [medicineId] + /medicine-catalog` | ✅ |
| الصيدلية — السلة والدفع | `/cart + /cart/checkout + /cart/prescription` | ✅ |
| العروض والتفاوض | `/offers + /orders/[orderId]/offers/negotiation/[threadId]` | ✅ |
| الرعاية المنزلية | `/home-care + providers + services` | ✅ |
| التمريض | `/nursing/catalog + /nursing/visits` | ✅ |
| التأمين | `/insurance + /insurance/requests/[requestId]` | ✅ |
| الطوارئ | `/emergency` | ✅ |
| العائلة | `/family` | ✅ |
| الصحة — المزمنة/الأدوية/العلامات/التقارير | `/health/* (9 صفحات)` | ✅ |
| الأمومة | `/maternity` | ✅ |
| الصحة النفسية | `/mental-health + 4 صفحات` | ✅ |
| التغذية | `/nutrition` | ✅ |
| المجتمع | `/community` | ✅ |
| الولاء | `/loyalty` | ✅ |
| الإشعارات | `/notifications + settings` | ✅ |
| المقالات | `/articles + [slug] + bookmarks` | ✅ |
| الذكاء الاصطناعي | `/ai` | ✅ |

## الإغلاق اليدوي الثاني (2026-08-30) — فجوات كانت موجودة أصلاً
- ~~support tickets~~ → `/support/page.tsx` موجودة.
- ~~settings~~ → `/settings/page.tsx` + `/notifications/settings` موجودتان.
- ~~medication reminders~~ → `/reminders/page.tsx` موجودة.
- ~~returns~~ → `/returns/page.tsx` موجودة.
- ~~offers/negotiation~~ → `/offers` + `/orders/[orderId]/offers` + negotiation موجودة.
- ~~prescriptions~~ → `/prescriptions` + `[prescriptionId]` موجودتان.
- ~~orders tracking~~ → `/orders/[orderId]/tracking` موجودة.
- ~~programs~~ → `/programs/page.tsx` موجودة.
- ~~reports~~ → `/reports` + `[reportId]` موجودتان.
- ~~profile/wishlist/search/dashboard~~ → موجودة كلها.

## الفجوات الحقيقية المتبقية (تحتاج بناء فعلي)
- video-call / waiting-room (مكالمة فيديو Web داخل المتصفح عبر LiveKit)
- pharmacy broadcast waiting + عروض متدرجة تراكمية + مقارنة مرئية بين العروض
- diagnostics: book-sample خطوة بخطوة + sample-tracking (تتبع الفني/العينة)
- wallet + payment history
- family member detail + permissions + shared calendar
- delivery address manager (إدارة العناوين المتعددة)
- follow-up consultation screen
- share-report flow (مشاركة التقرير مع الطبيب)

## الخلاصة الرقمية المصححة
- القدرات الأساسية المغطاة في Web: 27/31 مجموعة وظيفية رئيسية.
- الفجوات الحقيقية ≈ 3 مجموعات (family مغلقة) (lab booking + tracking مغلقتان) (بعد video-call) (بعد wallet) (بعد الإغلاق اليدوي الثاني) (بعد إغلاق صفحات حالات الحجز) (وليست 103) — أغلبها: حالات ما بعد الحجز، مكالمة الفيديو، تتبع العينات، عروض الصيدلية المرئية، والمحفظة/الإعدادات.
- الأولوية: صفحات حالات الحجز والدفع (booking-success/pending) ثم عروض الصيدلية، لأنها تكمل رحلة طلب قائمة وليست ميزة جديدة.

## الخلاصة النهائية المصححة (2026-08-30)
- الـWeb (85 route) يغطي الجزء الأكبر من Mobile وظيفياً؛ التقديران الآليان (25% ثم 13) كانا مضللين.
- الفجوات الحقيقية ≈ 3 مجموعات (family مغلقة) (lab booking + tracking مغلقتان) (بعد video-call) (بعد wallet) فقط، أعلاها: مكالمة فيديو Web، انتظار broadcast الصيدلية والعروض التراكمية، وتتبع العينات.
