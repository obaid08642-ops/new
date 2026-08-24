# Backend route reconciliation — Unified Bookings

Baseline backend source: `main @ 22526bedb77a3d8148219036367e4714f401aecc`. Audit-only; no booking changes.

`nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:399–430` declares `@Controller('unified-bookings')` with `@UseGuards(JwtAuthGuard)` (`:399–401`). The patient timeline route is `GET /unified-bookings/mine` with optional state/kind query (`:404`), correcting the previously observed `/home-care/bookings/my` collision. The controller exposes two route families:

| Action | Exact route | Method | Idempotency decorator |
|---|---|---:|---|
| Consultation create | `/unified-bookings` | POST | `@RequireIdempotency()` |
| Root consultation cancel | `/unified-bookings/:id/cancel` | POST | required |
| Root consultation reschedule | `/unified-bookings/:id/reschedule` | POST | required |
| Consultation call token | `/unified-bookings/:id/call-token` | GET | not mutation-decorated |
| Generic detail | `/unified-bookings/:kind/:id` | GET | n/a |
| Generic cancel | `/unified-bookings/:kind/:id/cancel` | POST | required |
| Generic reschedule | `/unified-bookings/:kind/:id/reschedule` | PATCH | required |
| Smart match | `/unified-bookings/match` | POST | not visibly decorated |
| Nursing broadcast | `/unified-bookings/nursing-broadcast` | POST | required |
| Cart checkout | `/unified-bookings/checkout-cart` | POST | required |

This confirms the previously corrected reschedule method issue: generic reschedule is `PATCH /unified-bookings/{kind}/{id}/reschedule`, while root consultation reschedule is `POST /unified-bookings/{id}/reschedule` (`:411–422`). A consumer sending POST with `:kind` is a real 404 drift, not a backend ambiguity. The call-token route is GET and guard-protected but has no visible TTL/window annotation at controller boundary (`:414–415`); those properties require service/live evidence.

All mutation handlers accept `@Body() b: any` (`:407,410,413,419,422,423,426,429`), so request schema, amount/slot/ownership/state validation and response types are not established at this boundary. The controller-level idempotency decorators cover create/cancel/reschedule/nursing broadcast/cart checkout, but not `match`; exact interceptor behavior and replay response remain to be verified. The booking and checkout handlers are CurrentUser-bound, yet owner/stranger/unauth and state-race behavior is service/runtime evidence still pending.

## Reconciliation disposition

The route/method map now provides fixed evidence for the booking BFF: root consultation reschedule is POST; kind-qualified reschedule is PATCH; home-care patient list is `/unified-bookings/mine`; cart checkout is `/unified-bookings/checkout-cart`. This does not close booking findings until DTOs, slot lock duration, quote/payment binding, idempotency replay, ownership, cancellation/refund and live Sandbox journeys are proven. No Phase 0 remediation was made.
