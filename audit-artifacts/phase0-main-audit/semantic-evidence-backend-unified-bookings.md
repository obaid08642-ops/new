# Semantic evidence — Backend UnifiedBookings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Controller contract

`audit-work/source/nabdah-backend/src/modules/unified-bookings/unified-bookings.module.ts:399–429` defines `@Controller('unified-bookings')` with `JwtAuthGuard`.

| Method | Route | Idempotency | Delegated behavior |
|---|---|---:|---|
| GET | `/unified-bookings/mine` | no | patient timeline, filters state/kind |
| POST | `/unified-bookings` | yes | consultation create contract |
| POST | `/unified-bookings/:id/cancel` | yes | owner-scoped consultation cancellation |
| POST | `/unified-bookings/:id/reschedule` | yes | owner-scoped consultation reschedule |
| GET | `/unified-bookings/:id/call-token` | no | LiveKit booking token |
| GET | `/unified-bookings/:kind/:id` | no | patient-owned detail, foreign/missing => NotFound |
| POST | `/unified-bookings/:kind/:id/cancel` | yes | domain-specific cancel |
| PATCH | `/unified-bookings/:kind/:id/reschedule` | yes | domain-specific reschedule |
| POST | `/unified-bookings/match` | no | provider ranking |
| POST | `/unified-bookings/nursing-broadcast` | yes | nursing radius match/optional auto-book |
| POST | `/unified-bookings/checkout-cart` | yes | multi-domain cart checkout |

## Direct observations

`UnifiedBookingsService.getOne` uses patient-scoped queries for orders, labs, radiology, home-care and appointments (`:103–113`), supporting a 404 ownership policy. Consultation create is explicitly cash-only and rejects non-cash payment identifiers (`:182–205`), so a card/insurance consultation flow cannot be claimed from this contract bridge.

`checkoutFromCart` dispatches lab, radiology, home-care, doctor and pharmacy groups (`:300–395`). It trusts line `price`/`name_ar` for item construction at the orchestrator boundary and performs best-effort rollback after any group failure; rollback errors are ignored. It clears cart groups only after all groups succeed. This requires contract review for server-side price authority, atomicity, idempotency replay, and partial failure observability.

The domain reschedule path accepts lab/radiology/nursing/consultation, but the radiology allowed-state array contains `RadiologyBookingState.CONFIRMED` twice (`:141–147`), which is likely redundant and should be verified against the intended state machine. Event emissions for lab/radiology/nursing reschedules use `service.confirmed` (`:138`, `:146`, `:154`) and swallow event-bus failures with `.catch(() => null)`, requiring outbox/durability verification.

## Related service evidence

The baseline contains two separate exported classes named `UnifiedBookingsService`: the controller-backed implementation in `unified-bookings.module.ts:33–397`, and a second implementation in `unified-bookings.service.ts:6–32`. The module registers the former (`unified-bookings.module.ts:459–460`), while the latter defines a Redis lock of 300 seconds and releases by provider/slot key (`unified-bookings.service.ts:13–30`). This duplicate service name is itself a contract/maintenance risk. The lock implementation conflicts with the 10-minute requirement and lacks owner validation on release; it is recorded as finding F-016 pending import/dependency reconciliation and a single authoritative lock implementation.

No Phase 0 remediation was made.
