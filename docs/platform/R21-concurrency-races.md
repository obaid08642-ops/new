# R21 - Concurrency races (2026-11-02)

Method: read each code path for check-then-write, fix what is really racy, and fire 50 parallel requests at a real MongoDB (`backend/src/common/concurrency-races.spec.ts`). With the fixes reverted, 4 of the 8 tests fail (coupon per user x2, refund cap, same refund id), so the tests do catch the races.

## Audit result
| case | finding | action |
|---|---|---|
| appointment, same doctor + slot | **Already safe on main**: `AppointmentSchema` has a unique partial index `{doctor_id, slot_start}` on active statuses (`appointment.schema.ts:157`) and `appointments.service.ts:294` maps E11000 to `slot_already_booked`. The brief's "non-unique indexes" does not match the code. | test: 50 inserts -> 1 wins, 49 E11000; a cancelled booking frees the slot |
| slot lock, same provider + slot_start | **Already safe**: unique partial index on `held/confirmed` (`slot-lock.schema.ts:26`), `SlotLocksService.reserve` maps E11000 to `slot_taken`. | test: 50 reserves -> 1 lock |
| slot ranges that overlap but start at different times (10:00-10:30 vs 10:15-10:45), and the buffer rule (`appointments.service.ts:182/850`) | **Still check-then-insert**: the unique index only covers the exact start. Two overlapping requests at the same moment can both pass. Not fixed here: a fix needs a per-provider atomic claim (a lock document per provider and day, or slots materialised as rows) and a product decision on slot grain. | open, needs owner of care/slots |
| ASAP lab/radiology/nursing broadcast accepted by two providers; photo offer accepted twice | **Already atomic**: `findOneAndUpdate({open:true, status...})`, first wins, the loser gets `offer_already_accepted`/null (`ordering-broadcast.service.ts:209, 342`); a failed booking reopens it. | read, not load-tested here (the service needs its whole stack) |
| pharmacy `acceptOrder` | **Fixed**: lock was `setnx` then `expire` (two commands: a crash between left a lock without expiry) and was never released when the confirm failed, locking every other pharmacy out for 5 minutes. Now one `SET NX EX 300`, released on failure. | fixed; not load-tested (Redis + allocation service) |
| coupon `max_uses` | already atomic (`used_count < max_uses` in the update). | test: 50 users, max 5 -> exactly 5 |
| coupon per-user limit | **Fixed**: `validate()` counted the user's earlier uses, then any number of parallel orders each passed. `apply()` now inserts the usage and checks it is among the first `limit` usages of that user by insertion order; the rest roll back. | tests: 1 user x 50 orders, limit 1 -> 1; limit 3 -> 3 |
| refund above refundable / double refund | **Fixed** (`RefundExecutor.reserveRefund`): the cap check was read-then-write and "idempotent per refund id" was an unlocked `exists()` before a gateway call. Now a unique reservation per refund id plus a per-booking running total in integer halalas raised by a conditional atomic update; a refund that fails before its ledger row gives its room back; a crashed `reserved` row can be taken over after 10 minutes. | tests: 50 different refunds of 30 on 100 -> 3 succeed (90); same id x50 -> money out once; failed refund releases |
| loyalty points / reward claim | already `$inc` with conditional guards (R79 comments in `loyalty.service.ts:186, 442`). | read only |
| wallet | balance is a projection of an idempotent ledger (`wallet-ledger.ts`), never incremented by hand. | read only |

## Known gaps in the refund guard
Refunds that do not go through `RefundExecutor` (`PaymentsService.refundPayment` is a read-modify-write on the transaction and the gateway enforces the cap; `MoyasarService.refundPayment`) do not feed `refund_totals`. The totals row is seeded from the payment record the first time a booking is refunded, so later executor refunds see earlier direct ones, but a direct refund racing an executor refund is not covered. Route them through the executor in the money migration (R11 P2).

## Operations
Index builds fail silently if production already holds duplicate active bookings or locks: check `db.appointments.getIndexes()` and `db.slotlocks.getIndexes()` on the server (R14 adds the checker). New collections `refund_reservations`, `refund_totals` (indexes are created on first use).
