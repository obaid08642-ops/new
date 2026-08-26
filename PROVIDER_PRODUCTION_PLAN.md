# خطة إنتاج تطبيق مزوّدي الخدمات — كامل السيناريوهات بلا أي mock

**المرجع الحاكم:** نفس قواعد PH-PHARMACY/PH-SERVICE + مصفوفات هذا الملف. **القاعدة الصفرية:** كل شاشة تستدعي API حقيقيًا — grep(mock|fake|placeholder|demo|TODO)=0 شرط قبول.
**الأساس:** تدقيق المزوّد الكامل (W1-W3) + نتائج الوكيل F-004/005/006/023/026/027.

---

## 1) مصفوفة السيناريوهات لكل نوع مزوّد (الحاكم)

### صيدلية (Pharmacy)
```
استلام: broadcast جديد يظهر فورًا (socket+polling) → عرض التفاصيل
عرض تقديمي: POST offer (items available/partial/alternatives + unit_price + eta + delivery_fee + cod_allowed + insurance_ready)
   ├─ Cash: مريض اختار عرضك → allocation PENDING_REVIEW → مراجعة سلة → confirm → PREPARING → READY/OUT_FOR_DELIVERY → delivered (+تحصيل COD إن كان) → EOD
   └─ تأمين: بعد الاختيار → استقبال طلب معالجة → رفع قرار التأمين بالبنود:
      POST /orders/:id/insurance-decision {items[approved/rejected/alt], copay_percent, insurer_share}
      → انتظار دفع تحمّل المريض (بطاقة/COD) → CONFIRMED → تنفيذ كما فوق
حالات خاصة: ناقص جزئي (chat بدائل موجود) • رفض البث • انتهاء SLA • إرجاع/RMA قرارات • procurement quotes
```
### طبيب (Doctor)
```
استلام: incoming consultation (socket ring + queue) → قبول/رفض(سبب) → غرفة انتظار
تنفيذ حسب النوع: video(LiveKit مربوط)/clinic(check-in QR)/home(خريطة+تنقل)
أثناء: SOAP notes + شات حقيقي + وصفة E-Rx (من كتالوج حقيقي) + طلب مختبر/أشعة/تمريض
تأمين: رفع قرار الموافقة/co-pay (نفس endpoint D) قبل الدفع
إنهاء: endConsultation (فشل=خطأ ظاهر) → sick-leave حقيقي → referral يُسجل ويُقرأ
إدارة: sessions pricing CRUD حقيقي + availability round-trip + إجازات
```
### مختبر (Lab)
```
استلام: booking جديد → تأكيد → (سحب منزلي: technician assign من roster حقيقي + GPS)
سلسلة العينة: barcode مسح → stages pipeline → QC actions (مع ownership)
نتيجة: entry بقيم structured → PDF upload حقيقي (storage/upload) → publish → إشعار للمريض
تأمين: coverage-decision + انتظار copay قبل PROCESSING
TAT حقيقي محسوب من الطوابع الزمنية (لا جدول hardcoded)
```
### أشعة (Radiology)
نفس المختبر + questionnaire PHI minimization + report draft→review→publish بصلاحيات + DICOM placeholder موثق.
### تمريض (Nursing)
استلام زيارة → respond → GPS check-in geofence → تنفيذ care plan tasks (checkboxes حقيقية) → vitals → توقيع المريض → visit-report → supplies request بهويته الحقيقية.
### مستشفى/منشأة (Facility)
staff CRUD (إصلاح حقل parent_provider_account_id) + shifts إنشاء/تعديل فعلي + beds/admission/discharge + surgeries + claims hub أفعال حقيقية + announcements + invitations + internal chat polling.
### إسعاف (Ambulance)
فتح المسار في App.tsx + تسجيل → missions pool → claim → GPS tracking → handover → complete → ledger.

## 2) البناء المطلوب (Backend endpoints جديدة)
| Endpoint | الغرض |
|---|---|
| POST /orders/:id/insurance-decision | رفع قرار بنود الصيدلية |
| POST /(labs|radiology|homecare)/bookings/:id/coverage-decision | قرار تغطية الخدمات (نمط D) |
| GET+POST /provider/crm/:patientId | CRM persistence حقيقي |
| GET /provider/referrals/mine | تتبع الإحالات |
| CRUD /hospital/staff-roster/technicians | قائمة الفنيين |
| CRUD /facility/shifts | الشيفتات |
| POST /claims/:id/{resubmit,approve,reject} | أفعال مطالبات المنشأة |
| GET /provider/reports/inbound | التقارير الواردة الحقيقية |
| PATCH /provider/profile/availability | round-trip كامل |

## 3) المراحل (بناء→بوابة→تثبيت لكل مرحلة)
| # | المرحلة | المحتوى | القبول |
|---|---|---|---|
| P1 | فك الارتباط الوهمي | حذف demo patients/fake success/fake chat/EHR hardcoded/wallet seeds/rx templates/POL-MEM عشوائية/NPHIES الإجباري/debug alerts + wire VideoCallRoom + /push/register | grep نظيف + فيديو مكالمة حقيقية تعمل |
| P2 | عقود مشتركة | shared-contracts للـ7 أنواع (آلات حالة الاستلام→الإتمام أعلاه) | types مستوردة |
| P3 | endpoints الجديدة (الجدول) + إصلاحات ownership | 9 endpoints | e2e لكل endpoint |
| P4 | صيدلية كاملة السيناريوهات | عرض/قرار تأمين/COD settlement/returns أفعال | 8 سيناريو e2e |
| P5 | طبيب كامل | فيديو+SOAP+Rx+sickleave+referral+CRM+availability | 10 سيناريو |
| P6 | مختبر+أشعة | roster/QC/TAT حقيقي/upload فعلي | 6 سيناريو |
| P7 | تمريض+منشأة+إسعاف | care plans/shifts/claims/ambulance route | 9 سيناريو |
| P8 | Dashboards & Settings | KPIs من تجميعات حقيقية + settings كاملة (password/2FA/notifications/lang sync) + i18n قاموس | لقطات + e2e |
| P9 | بوابة نهائية | contracts.test يغطي الأنواع الـ7 + لا mock + staging smoke | GO |

**التقدير:** ~4–5 أسابيع (مهندسان).
