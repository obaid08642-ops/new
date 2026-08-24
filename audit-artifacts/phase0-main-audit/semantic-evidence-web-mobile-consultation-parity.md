# Semantic evidence — Web versus Mobile consultation parity

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Search parity

Web `app/[locale]/consultations/doctors/page.tsx:10–17` performs SSR `getPublicDoctors` with `search`, `specialty`, and `sort`, has localized unavailable/empty states, accessible search labeling, and links to `/consultations/doctors/{id}`. Mobile `doctor-search.tsx:38–89` calls `/care/doctors`, performs client sorting/filtering and routes to `/consultations/doctor/[id]` and `/consultations/book/[id]`. The route shapes, rendering model, and error semantics differ and require canonical parity mapping.

## Booking parity

Web `components-next/appointment-booking-form.tsx:10–29` accepts server-provided slots, filters available slots, captures notes, creates an idempotency key on selection, and posts `/api/appointments/book` with `{doctor_id,type,slot_id,notes}`. It maps 401/409/general errors and redirects to appointment detail.

Mobile `consultations/booking-confirm.tsx:163–249` instead posts `/care/appointments` directly, computes local totals, supports card/insurance/cash branches, calls payment intent or insurance request, and routes to processing/payment-split/success. Backend UnifiedBookings exposes a separate consultation bridge at `POST /unified-bookings` which is cash-only. At least three booking boundaries therefore coexist in baseline: Web BFF `/api/appointments/book`, Mobile `/care/appointments`, and backend `/unified-bookings`. Exact ownership, idempotency, payment, and state behavior must be reconciled before parity or production claims.

## Confirmed parity gaps

1. Web does not expose Mobile's payment-method selection or insurance flow in this component.
2. Mobile does not use the Web BFF boundary and does not share the Web slot contract/parser.
3. Web redirects to appointment detail after booking; Mobile branches to payment processing, insurance split or success.
4. Web notes are capped at 2000 characters; Mobile source passes notes without the same visible cap in the confirmed range.
5. Web slot selection creates idempotency key on choose; Mobile confirmation uses payment idempotency only for card and does not prove an idempotency key on appointment create in the confirmed source.

No Phase 0 remediation was made.
