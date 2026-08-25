# Phase 0B semantic evidence — Care appointment state tests

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/care/tests/appointments-states.spec.ts:1–201`

This Jest unit spec constructs `AppointmentsService` with mocked appointment/provider models, event emitter, workflow engine and database connection (`8–31`). It checks the nominal lifecycle PENDING→CONFIRMED→CHECKED_IN→IN_PROGRESS→COMPLETED and terminal states, rejects invalid/terminal transitions, verifies confirmation history/event emission, permits the narrow internal system actor, accepts provider account identity, and returns NotFound for an unknown appointment (`46–98`).

Cancellation tests cover patient refund outcomes based on time-to-slot, doctor no-show, doctor cancellation penalty, stranger rejection and admin cancellation (`100–147`). Reschedule tests check replacement creation before old transition, conflict preservation, compensating deletion if old save fails, and rejection of a past slot (`149–199`). These are valuable business-rule regressions, but they are entirely mock-based and do not prove database transactions, unique slot locks, webhook/payment ledger settlement, idempotency/replay, notification delivery, timezone/DST behavior, concurrent cancellation/reschedule, or live HTTP ownership semantics.

The system actor assertion is a unit-level allowance and does not prove that only an internal authenticated path can mint `{id:'system',role:'system'}`. The admin test asserts broad cancellation ability but does not test admin scope/audit or protected clinical/financial projections. Refund assertions validate returned percentages/destination and an event emission, not an actual refund record, gateway call, wallet credit, ledger balance or exactly-once processing (`77–86,100–147`).

Reschedule compensation uses `deleteOne` after a save failure, which is a compensating pattern rather than atomic transaction proof; the test does not simulate delete failure, duplicate replacement, unique-slot race, event replay or orphan state. Time calculations rely on `Date.now()` and do not lock timezone/clock, and the future slot helper rounds UTC minutes without testing provider timezone or DST (`149–199`). No test was run and no product code was changed during this semantic read.
