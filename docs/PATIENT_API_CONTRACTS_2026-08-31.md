# عقود API الجديدة (CompatModule) — Phase 1.3 — 2026-08-31

مصدر الحقيقة: backend/src/modules/compat/compat.module.ts — كلها JwtAuthGuard + تحقق ملكية + DB حقيقية.

## الـ endpoints

- `POST /patient/pharmacy/orders` — create order (items[]|prescription_id|manual_request, delivery_address_id, payment_method, insurance_policy_id)
- `GET /patient/pharmacy/orders` — list my orders (limit<=100, page)
- `GET /patient/pharmacy/orders/:id` — order detail (ownership-enforced via mustOwnBooking)
- `GET /home-care/services` — active non-package catalog from nursing_catalog (limit<=200)
- `GET /home-care/packages` — active package catalog from nursing_catalog (limit<=200)
- `POST /home-care/bookings` — create booking (service_id|package_id required, scheduled_at, address_id, payment_method, insurance_policy_id)
- `GET /home-care/bookings/my` — list my home-care bookings (paginated)
- `GET /refunds/my` — my refunds (paginated)

## استهلاك الموبايل (patient-app) — نفس العقد

- `patient/pharmacy/orders` ← patient-app/app/pharmacy/broadcast-status.tsx, patient-app/app/pharmacy/checkout.tsx, patient-app/app/pharmacy/final-quote.tsx
- `home-care/services` ← patient-app/app/(tabs)/nursing.tsx, patient-app/app/nursing/service-info.tsx
- `home-care/packages` ← patient-app/app/(tabs)/nursing.tsx
- `home-care/bookings` ← patient-app/app/nursing/nurse-profile.tsx, patient-app/app/orders/index.tsx
- `refunds/my` ← patient-app/app/insurance/refund-status.tsx

## استهلاك الويب (patient-web)

- `patient/pharmacy` ← patient-web/lib/api/patient-allowlist.test.ts, patient-web/lib/api/patient-allowlist.ts, patient-web/lib/api/pharmacy-actions.test.ts
- `home-care` ← patient-web/lib/api/home-care-providers-server.ts, patient-web/lib/api/home-care-server.test.ts, patient-web/lib/api/home-care-server.ts
- `refunds` ← يُربط في المرحلة 4 (web parity)

## ملاحظة الجودة
غير مُختبَر بعد في هذا الصندوق (npm معطوب) — تُشغّل typecheck/tests/build في CI قبل أي دمج لـ main.