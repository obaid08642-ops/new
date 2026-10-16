# Write-path resilience (P14.4)

## Changed: campaign fan-out goes through the queue, in pages, with no cap
Found by the capacity run (`docs/perf/load-test-2026-10-16.md`, P14.27): a broadcast queued one push job per user,
one at a time, **inside the admin's HTTP request** (20,002 users: 16.2 s), and the audience list stopped at 100,000
users without saying so.

Now (`admin-notification-center.module.ts`):
- **The request** (`POST broadcasts`, `POST campaigns/:id/send`, the scheduler) only claims the campaign once
  (`draft`/`scheduled` → `sending`, a conditional update, so two clicks start it once) and counts its real audience,
  then answers `{ ok, status: 'sending', targeted }`.
- **The worker** (`@Interval(10 s)`, worker role only) takes a `sending` campaign under a 60 s lease and queues its pushes
  in pages of 1,000 users (ordered by id, one `addBulk` per page, job id `campaign-<id>-<user>`). After each page it
  saves the cursor and the counts and renews the lease.
- **Failure:** a queue or database error keeps the saved pages; after the lease the next tick continues from the cursor.
  Five errors in a row mark the campaign `failed` with the error. A worker that dies is replaced the same way. At most
  the one page in flight is queued again (same job ids: the queue skips those it still holds).
- **No cap:** the segment is a Mongo filter (`segmentFilter`), paged through; `targeted` is the real count.

Measured on the local test stack (test data, 20,052 patients): the request **16.2 s → 0.09 s**; every push queued
**10.6 s** after the click (including up to 10 s waiting for the worker's next tick); status `sent`, stats
`targeted = sent = 20,052`.

Tests (`campaign-fanout-p144.spec.ts`): 100,000 patients (past the old cap) queued in pages of at most 1,000, each user
once, the request queuing nothing and a second send refused; an error after two pages keeps them and the next run after
the lease finishes with each of 3,500 users queued once; an error that keeps coming back fails the campaign after five.

## Already in place (checked, not changed)
- **Idempotent API:** `IdempotencyInterceptor` (global, Redis lock + stored answer per `Idempotency-Key`), required on
  money and booking mutations with `@RequireIdempotency()`; payment webhooks deduplicated per event id
  (`webhooks.service.ts` `isReplay`/`markReplay`).
- **Outbox:** `EventBusService` writes each domain event to its durable log before the in-process fan-out, and a
  failed write stops the fan-out; `event-reliability/reconciliation.service.ts` re-checks catalogue publication against
  the source collections.
- **Queue for side effects:** push delivery (`push_notifications`) and notification delivery (`notifications-delivery`)
  are BullMQ queues with retries and backoff, consumed only in the worker role (P14.26).
