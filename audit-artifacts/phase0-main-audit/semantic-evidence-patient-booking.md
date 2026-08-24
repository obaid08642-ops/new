# Semantic evidence — Patient Web appointment booking

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Booking form

Source: `nabd-patient-web/components-next/appointment-booking-form.tsx`.

The form filters available slots, generates a new UUID idempotency value when a slot is selected, blocks duplicate submit while submitting, sends notes with a 2,000-character client limit, and maps 401/409/general failure into translated messages. It calls `POST /api/appointments/book` with doctor/type/slot and optional notes and redirects to `/${locale}/appointments/${booking_id}` on a successful response.

The form does not display or collect payment method, insurance, cash policy, consent, price quote, or appointment lock details. Its visible `lockNotice` is only a translated UI label. These business rules must be verified in the downstream contract and cannot be inferred from the form.

## Booking BFF

Source: `nabd-patient-web/app/api/appointments/book/route.ts`.

The BFF requires a 16–128 character `idempotency-key`, validates doctor UUID, service type, slot id and notes with Zod, requires the httpOnly access cookie, forwards idempotency and optional device id to `POST /unified-bookings`, validates a response containing UUID `booking_id` and status `pending_payment|confirmed`, and returns `cache-control: no-store`.

This is a stronger mutation boundary than the GET-only patient catch-all. Remaining proof requirements are the live Backend method/path, DTO ownership, slot lock duration and atomic replay behavior, server price/quote/payment state, insurance/cash semantics, appointment cancellation/reschedule/call-token, and owner/stranger/unauth tests. The BFF accepts `payment_method_id` in its schema but the form does not send it, so payment continuation is not established by this route.

No Phase 0 remediation was made.
