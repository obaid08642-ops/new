# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PHASE7_CONSULTATION_GET_DETAIL_AR.md`
- **Member SHA-256:** `470376012b447303066b2cce4de9bfc65880a23bb00d458050abdb45c79c6171`
- **Line count:** 7
- **Read range:** `1-7`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: # Consultations/Booking — GET detail alignment`
- `3: تمت مواءمة صفحة appointment detail مع استدعاء Mobile والعقد المنشور `GET /care/appointments/{id}` بدل المسار غير المثبت `unified-bookings/consultation/{id}`. أضيف UUID-only route إلى GET allowlist، واختبار SSR يثبت أن access token وpatient `
- `5: لم تُفتح booking creation/cancel/reschedule أو call-token. OpenAPI الحالي يملك مسارات care appointments وunified-bookings مختلفة عن حزمة العقد، ولا يثبت بعد exact DTO/idempotency/slot-lock/call-token window المطلوب.`
### backend_consumers_or_contracts
- `3: تمت مواءمة صفحة appointment detail مع استدعاء Mobile والعقد المنشور `GET /care/appointments/{id}` بدل المسار غير المثبت `unified-bookings/consultation/{id}`. أضيف UUID-only route إلى GET allowlist، واختبار SSR يثبت أن access token وpatient `
### auth_ownership
- `3: تمت مواءمة صفحة appointment detail مع استدعاء Mobile والعقد المنشور `GET /care/appointments/{id}` بدل المسار غير المثبت `unified-bookings/consultation/{id}`. أضيف UUID-only route إلى GET allowlist، واختبار SSR يثبت أن access token وpatient `
- `5: لم تُفتح booking creation/cancel/reschedule أو call-token. OpenAPI الحالي يملك مسارات care appointments وunified-bookings مختلفة عن حزمة العقد، ولا يثبت بعد exact DTO/idempotency/slot-lock/call-token window المطلوب.`
### state_transitions
- `5: لم تُفتح booking creation/cancel/reschedule أو call-token. OpenAPI الحالي يملك مسارات care appointments وunified-bookings مختلفة عن حزمة العقد، ولا يثبت بعد exact DTO/idempotency/slot-lock/call-token window المطلوب.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: لم تُفتح booking creation/cancel/reschedule أو call-token. OpenAPI الحالي يملك مسارات care appointments وunified-bookings مختلفة عن حزمة العقد، ولا يثبت بعد exact DTO/idempotency/slot-lock/call-token window المطلوب.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
