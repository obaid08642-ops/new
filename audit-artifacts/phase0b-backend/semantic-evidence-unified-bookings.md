# Phase 0B semantic evidence — Unified Bookings

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/unified-bookings/unified-bookings.service.ts:2–32`
- `src/modules/unified-bookings/unified-bookings.module.ts:2–462` (service, controller and module are co-located)

The standalone `unified-bookings.service.ts:13–30` is a separate Redis lock helper with a 300-second provider/slot lock and unconditional `del` release; it is not the service wired by the module. The co-located service in `unified-bookings.module.ts:33–397` merges six domain collections with broad `patient_id` filters, derives universal states/totals/titles, and exposes get-one/cancel/reschedule, consultation contract, smart matching, nursing radius broadcast and cart checkout. `:103–160` scopes get-one/cancel/reschedule reads for patient ownership in many branches, but lab/radiology/nursing reschedules directly mutate scheduled dates and emit best-effort events without visible slot availability/lock/idempotency/transaction; consultation delegates to AppointmentsService.

`:168–220` resolves consultation slots from provider availability, but `:188–205` intentionally supports cash only and rejects other payment methods. `:223–225` delegates call-token issuance to LiveKit. `:258–297` radius broadcast repeatedly calls rankProviders but does not visibly alter the radius query itself; auto-book creates cash HomeCare and then performs a separate transition with catch-to-null while still returning booking. `:304–395` loops cart groups, passes client-provided names/prices/items/insurance/payment fields to domain services, creates each group independently, attempts compensating cancellation on any failure while ignoring rollback failures, and clears successful cart groups separately.

`UnifiedBookingsController:399–430` exposes `mine`, root consultation POST/cancel/reschedule/call-token, generic kind/id reads/mutations, match, nursing broadcast and cart checkout. Root cancel/reschedule are POST despite the published PATCH reschedule contract in the audit context; bodies are raw `any` and only some routes have idempotency decorators. Module `:439–462` wires all domain modules and schemas.

## Findings candidates

The read supports: route/method drift, client-derived financial/catalog fields, non-atomic multi-domain checkout/rollback, direct reschedule mutation without slot lock, false-success nursing transition, cash-only payment gap, broad timeline projection and missing DTO/ownership/role/transaction/audit controls.

No product code was changed and no tests/builds were executed during this semantic read.
