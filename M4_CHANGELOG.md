# سجل تغييرات المرحلة M4 — التدفقات الممتدة وربط الشاشات (اند-تو-اند)

**التاريخ:** 2026-07-24 · **الفرع:** `m4-extended-flows` (مبني على `m3-insurance-finance`)
**التحقق:** `tsc --noEmit` = **صفر أخطاء** للمشاريع الثلاثة (backend · provider · patient).

> ملاحظة تشغيلية: أُعيد إنشاء `InsuranceRequestsScreen.tsx` بعد فقدانه عند إعادة تشغيل بيئة العمل — أُعيد بناؤه من عقد M3 الموثقة وتم تسجيله في كل اللوحات.

---

## 1) الباك إند (nabdah-backend) — تم في بداية M4 ويُسلَّم الآن
- **`provider-ops.module.ts` — ConsultationSummary:** مخطط + كنترولر جديد:
  - `POST /care/appointments/:id/summary` — الطبيب يكتب الملخص (تشخيص/ملاحظات/توصيات/وصفة/نافذة متابعة افتراضيًا 7 أيام) — يُقفل الموعد COMPLETED تلقائيًا.
  - `GET /care/appointments/:id/summary` — قراءة للمريض/الطبيب/الأدمن فقط.
- **`insurance-engine.module.ts`:** alias `GET /insurance/claims/my` ← `myRequests` (توافق واجهة المريض).

## 2) تطبيق المزود (NabdProvider) — شاشة قرارات التأمين (BR-2)
- **جديد `src/screens/shared/InsuranceRequestsScreen.tsx`:** طابور الطلبات الوارد `GET /insurance/requests/provider/queue` + مودال قرار بثلاث طرق (قبول كلي · جزئي بنسبة copay 1–99 مع معاينة مبلغ فورية · رفض بسبب إلزامي) ← `POST /insurance/requests/:id/decide`. حالات عربية لكل STATE مع Pull-to-refresh وSkeleton وEmpty/Error.
- **تسجيل + نقاط دخول في اللوحات الست:** Doctor (بطاقة رئيسية + صف إعدادات) · Facility (قائمة إجراءات) · Lab · Nursing (صفوف إعدادات) · Pharmacy (زر في إعدادات الدفع) · Radiology (بطاقة تأمين في الإعدادات مع تمرير onNav).
- **جديد `.gitignore`** (كان مفقودًا من الحزمة).

## 3) تطبيق المريض (nabd_plus)
- **جديد `app/consultations/booking-pending.tsx` (M4-FE1):** شاشة انتظار قبول المزود — استطلاع `GET /appointments/:id` كل 5 ثوانٍ + مؤقّت منقضٍ + نبضة انتظار؛ عند CONFIRMED توجيه تلقائي حسب النوع (عيادة→clinic-confirm · منزل→home-visit-tracking · فيديو→virtual-waiting-room) **بالمعرّف الحقيقي**؛ عند CANCELLED/تجاوز 15 دقيقة: شاشة استرداد + زر إلغاء حقيقي `PATCH /appointments/:id/cancel`.
- **جديد `app/consultations/clinic-confirm.tsx` (M4-FE2 / BR-3):** الشاشة الختامية لحجز العيادة — **QR حقيقي** للحجز (`react-native-qrcode-svg`، أُضيف للحزمة) + بيانات العيادة من `GET /care/doctors/:id` (facility) + اتجاهات/اتصال/محادثة + تحضيرات + **سياسة الإلغاء والاسترداد** (100/50/0) + زر إلغاء/إعادة جدولة.
- **جديد `app/consultations/summary.tsx`:** ملخص الاستشارة للمريض (تشخيص/وصفة/ملاحظات/توصيات) + **زر حجز متابعة** خلال النافذة + ربط إرسال الوصفة لصيدلية وتقييم الاستشارة.
- **`booking-success.tsx`:** إزالة `APT001` الثابت — كل المسارات تمر عبر booking-pending بالمعرّف الحقيقي.
- **`payments/success.tsx`:** يمرّر bookingId إلى booking-pending عند توفره.
- **`appointment-detail.tsx`:** **إصلاح تعطّل مؤكد** — `AR` كان غير معرّف في مودال PENDING_COPAY (كراش وقت التشغيل) ← `lang` من السياق؛ + زر «عرض ملخص الاستشارة» عند COMPLETED.
- **الأشعة للمريض (M4-FE6):**
  - `diagnostics/orders.tsx`: دمج `GET /radiology/bookings/mine` مع التحاليل في قائمة موحدة.
  - `diagnostics/my-results.tsx`: دمج `GET /radiology/reports/mine` + حالات الأشعة (REPORT_READY/PENDING/SCANNING) + فتح PDF الموقّع أو صفحة التتبع + أيقونة/تسمية أشعة.
- (الحجز نفسه مع استبيان السلامة كان مربوطًا مسبقًا في `diagnostics/checkout.tsx` ← تأكدنا سلامته.)

## 4) قرارات وديون مسجلة
- خصم المتابعة يُمرَّر كبارامتر (`followUp/windowDays`) لـ booking-confirm — **تطبيق الخصم الفعلي يُربط بمحرك quote في M5/M6** (مسجل في الديون).
- نتائج الأشعة النصية (`clinical_impression_report`) تُعرض عبر view-report إن وُجد PDF؛ عارض نصي مخصص لاحقًا إن طُلب.
- ازدواج مخططي RadiologyBooking (`modules/radiology/schemas` مقابل `schemas/radiology.schema.ts`) — الكنترولر يستخدم الأخير؛ يُدمج في M7.

## 5) التسليم
- زيبات محدثة: `nabdah-backend.zip` · `NabdProvider.zip` · `nabd_plus.zip` (+ نسخ في `output/`).
- تحديث `PROJECT_CONTEXT.md` (قسم 4 — حالة M4 ✔).
