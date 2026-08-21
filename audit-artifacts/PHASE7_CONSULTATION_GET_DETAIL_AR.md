# Consultations/Booking — GET detail alignment

تمت مواءمة صفحة appointment detail مع استدعاء Mobile والعقد المنشور `GET /care/appointments/{id}` بدل المسار غير المثبت `unified-bookings/consultation/{id}`. أضيف UUID-only route إلى GET allowlist، واختبار SSR يثبت أن access token وpatient PII وclinical/private fields لا تظهر في HTML.

لم تُفتح booking creation/cancel/reschedule أو call-token. OpenAPI الحالي يملك مسارات care appointments وunified-bookings مختلفة عن حزمة العقد، ولا يثبت بعد exact DTO/idempotency/slot-lock/call-token window المطلوب.

التحقق: targeted consultation tests، full Vitest، truthful-runtime، TypeScript، production build، وdiff check.
