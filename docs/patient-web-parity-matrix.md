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

## الفجوات الحقيقية المتبقية (تحتاج بناء)
- video-call / waiting-room (مكالمة فيديو Web داخل المتصفح)
- booking-success/pending كصفحات حالة مستقلة بعد الحجز
- cancel-reschedule (إلغاء/إعادة جدولة من صفحة الموعد)
- follow-up و prescription-from-doctor و share-report
- diagnostics: book-sample خطوة بخطوة، sample-tracking، my-results
- pharmacy: broadcast waiting + عروض متدرجة + مقارنة عروض مرئية
- wallet + payment history
- support tickets (إنشاء/تتبع)
- settings (الحساب/الأمان/الأجهزة/حذف الحساب)
- medication reminders + chronic refill سريع
- family member detail + permissions + calendar
- returns (إرجاع الطلبات)
- delivery address manager

## الخلاصة الرقمية المصححة
- القدرات الأساسية المغطاة في Web: 27/31 مجموعة وظيفية رئيسية.
- الفجوات الحقيقية ≈ 13 مجموعة (وليست 103) — أغلبها: حالات ما بعد الحجز، مكالمة الفيديو، تتبع العينات، عروض الصيدلية المرئية، والمحفظة/الإعدادات.
- الأولوية: صفحات حالات الحجز والدفع (booking-success/pending) ثم عروض الصيدلية، لأنها تكمل رحلة طلب قائمة وليست ميزة جديدة.
