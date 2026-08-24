# Semantic evidence — Patient Web appointment lifecycle

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Payment intent

Source: `app/api/appointments/[appointmentId]/payment-intent/route.ts`.

The BFF accepts POST, validates UUID appointment id, requires a 16–128 character idempotency key, requires the httpOnly access cookie, calls a server-side `createPatientPaymentIntent` helper for `consultation`, validates the response through `parsePaymentIntent`, and returns `no-store`. It does not accept a client payment amount or provider credential. The actual provider and upstream contract are outside this file and must be traced before payment acceptance.

## Cancellation

Source: `app/api/appointments/[appointmentId]/cancel/route.ts`.

The BFF uses POST, UUID validation, required idempotency key, an optional 500-character reason, httpOnly access authentication, and forwards to `POST /unified-bookings/consultation/:id/cancel` with no-store response. Owner/stranger behavior, allowed status transitions, refund policy and replay result remain unverified.

## Reschedule

Source: `app/api/appointments/[appointmentId]/reschedule/route.ts`.

The BFF uses PATCH, UUID validation, required idempotency key, and requires either `new_slot_id` or an offset-aware `scheduled_at`; it forwards exactly PATCH to `/unified-bookings/consultation/:id/reschedule`. This exact method/path evidence prevents the historical POST-vs-PATCH drift. Slot ownership, ten-minute lock, price changes, insurance/cash behavior and replay remain to be proven.

## Call token

Source: `app/api/appointments/[appointmentId]/call-token/route.ts`.

The BFF uses GET, UUID validation, httpOnly authentication, calls `/unified-bookings/:id/call-token`, strips the response through a LiveKit token schema, and returns no-store plus `nosniff`. It does return a short-lived call token to the authenticated browser response by design; this is not a browser storage leak, but the upstream authorization, TTL, participant ownership and time-window policy require live/test evidence.

## Phase 0 conclusion

The Web appointment BFF layer has explicit validation and idempotency boundaries for mutations, but it is not enough to claim a complete patient journey. The following remain separate acceptance gates: canonical Backend contract and exact status codes, owner/stranger/unauth, idempotent replay for booking/payment/cancel/reschedule, slot locking, server quote/total, payment provider settlement/refund, insurance and cash branches, notification/outbox, and UI continuation after each response. No remediation was made.
