# Phase 8 — Mutation Contract Audit

تمت مراجعة patient-facing mutation routes في Pharmacy، Insurance/Claims، وUnified Bookings مقابل المصدر الحقيقي. توجد بعض فحوص ownership داخل الخدمات، مثل lookup بـ `patient_id: user.id` في unified bookings، لكن لم يتم إثبات contract موحد لـ idempotency key، replay handling، duplicate submission semantics، أو response contract يمكن للـBFF والواجهة اعتماده بأمان.

لذلك بقيت العمليات التالية Deferred: إضافة عناصر السلة، إنشاء/إرسال طلب pharmacy، submit claim، إنشاء insurance request، دفع copay، cancel/resubmit/appeal، حجز/إلغاء/إعادة جدولة booking، ورفع ملفات التأمين أو التقارير. عدم وجود زر في Web ليس نقصًا وهميًا؛ هو تطبيق صادق لسياسة No-Go.

ما يلزم لفتح mutation هو DTO/OpenAPI محدد، idempotency key أو backend deduplication مثبت، ownership/authorization tests للمريض والـstranger، status/error mapping، وSandbox حي يثبت replay وtimeout behavior. حتى ذلك الحين لا تُرسل الواجهة POST/PATCH/DELETE.
