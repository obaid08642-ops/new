# R2 - Durable events (transactional outbox) for money paths (2026-11-02)

Problem: `this.events.emit('payment.completed', ...)` is in-process. If the API dies after the transaction is saved and before the listeners ran, the booking is never confirmed, the credit note is never issued, nobody is notified, and nothing records that it was missed.

## Mechanism (`backend/src/modules/durable-events/`)

| step | what | where |
|---|---|---|
| write | `enqueue(type, payload, {key, session?})` upserts one row in `durable_events` (unique `key`). With a Mongo `session` it commits with the state change. | `durable-events.service.ts` |
| first delivery | run **in the writing process**, before the request continues (as the old `emit` did). The API process owns the websocket gateway listeners, the worker does not, so first delivery cannot move to the worker. | `deliverNow` |
| claim | `findOneAndUpdate` pending -> processing with a 60 s lease and `attempts+1`. Two consumers never run one key at once. | `process` |
| handle | `emitter.emitAsync(type, {...payload, __durable:{key, delivery}})`; a throwing listener fails the delivery. | `process` |
| retry | back to pending with exponential backoff (2 s ... 15 min); `dead` after 8 attempts. | `backoffMs`, `MAX_ATTEMPTS` |
| recovery | BullMQ queue `durable-events` (jobId = key) consumed by the **worker** role only, plus a 10 s sweeper (`@Interval`) that re-queues due rows: pending past `next_at`, or processing with an expired lease (the handler's process died). | `durable-events.processor.ts` |
| gap closer | `PaymentEventsReconciler`: a `paid` transaction older than 2 min with no `payment.completed:<txn id>` row (process died between `t.save()` and `enqueue`) gets the event. Only payments made after its first run, so deploying never replays history. | `payment-events.reconciler.ts` |

Idempotency keys: `payment.completed:<txn id>` (verify, capture and reconciler share it), `payment.failed:<txn id>`, `payment.refund.card:<gateway refund ref>`, `payment.refund:<refund_id>` (the refund id the refund executor and ledger use), `payment.refund:moyasar:<id>:<refunded total>`, `refund.requested:<id>`, `refund.decided:<id>:<decision>`, `payment.abandoned:<appt id>`, `order.created:<order id>`, `refund.execution_failed:<order>:<amount>`.

## Converted (11 emit sites, via `emitDurable`)
payments.module (completed x2, failed, refund.card, abandoned), finance-engine RefundExecutor (payment.refund), moyasar (payment.refund), insurance-engine (refund.requested), patient-ux (refund.requested, refund.decided), orders.service (order.created x2, refund.execution_failed). Services take `DurableEventsService` as a last `@Optional()` constructor argument; without it `emitDurable` falls back to the old plain emit, so hand-built unit tests are unchanged. `DurableEventsModule` is `@Global`.

## Guarantees and what is NOT guaranteed
- Never lost: the row is durable before any listener runs; a restart, a Redis outage or a dead worker is covered by the sweeper (tests: kill between write and handler; kill mid-handler with an expired lease).
- Never two rows, never concurrent for one key (tests: 10 simultaneous writers, 5 racing consumers).
- **At-least-once, not exactly-once**: if the process dies after the listeners ran and before the row is marked done, the sweeper redelivers (`__durable.delivery` = 2). A listener that must not repeat should dedupe on `__durable.key`. I did not audit every listener for idempotency. Listeners of these events to check: notifications (`payment.completed`, `refund.*`), push, loyalty, labs, radiology, insurance copay, billing credit note (`payment.refund.card`, keyed on `refund_ref`), appointments.
- The API-only realtime gateway `@OnEvent('payment.*'|'order.*')` is a UI hint: it runs on first delivery only; a redelivery in the worker does not reach websocket clients.
- Not converted here (same helper, follow-up): the `order.*` state-transition emits inside `engine.apply(... mutate)` in orders.service (they fire before the engine saves, so they need the engine's hook, not an emit swap), homecare/radiology booking emits, `medical_orders.emitted`. Those already write a `system_events` audit row through the engine/bus.

## Operations
- `DurableEventsService.stats()` -> `{pending, processing, dead, stuck_over_5min}`; `replayDead(key?)` returns dead rows to pending. Not yet on an admin route or in `event-reliability` health (next to `stuck_outbox`); small follow-up so S's alert (#2407) can page on `dead > 0` or `stuck_over_5min > 0`.
- New collections `durable_events` (indexes created at startup) and `durable_meta`. No retention on `done` rows yet: add a TTL once the owner decides how long to keep them (`system_events` is the long-term record).
