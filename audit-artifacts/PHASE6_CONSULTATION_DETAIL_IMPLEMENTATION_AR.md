# Phase 6 — Consultation detail Contract Pack

تم فحص UnifiedBookingsController وService. العقد `GET /unified-bookings/{kind}/{id}` يتحقق من `patient_id` ويدعم `consultation`، لذلك أضيف BFF GET bounded لمسار `unified-bookings/consultation/{uuid}`، ونُقلت Appointment detail Web إلى هذا العقد. قائمة Appointments القديمة بقيت على `/care/appointments` حتى يثبت filter/query contract للقائمة الموحدة.

تم تحديث parser/SSR/server-boundary tests وإضافة allowlist UUID ورفض المسارات المتداخلة/writes. لم يتم فتح `POST /unified-bookings/{kind}/{id}/cancel` أو `PATCH .../reschedule` أو `POST checkout-cart/match/nursing-broadcast`.

آخر gate نجح: full Vitest 59 files passed و14 skipped، 107 tests passed و23 skipped، truthful gate على 183 production files، TypeScript، production build، وdiff check. Sandbox appointments owner/stranger موجود كاختبار لكنه skipped لأن credentials/base URL غير متاحة.

ما يلزم للخطوة التالية: DTOs وslot-lock/idempotency وowner/stranger/expiry tests للحجز، cancel/reschedule، ثم realtime/virtual waiting room/payment/video contracts قبل بناء أزرار Mobile المقابلة.
