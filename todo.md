# Project TODO

- [x] Define governed expiry fields and index strategy for pharmacy offers and broadcasts.
- [x] Implement the single idempotent `expireDuePharmacyOffers(now, cursor, limit)` command with bounded batches and a concurrency lease.
- [x] Add audit and transactional-outbox records for expiry outcomes without direct notification, refund, stock restoration, or payment cancellation.
- [x] Add rollback-safe Mongo migration artifacts and documented forward/rollback procedure without executing migrations.
- [x] Add local tests for retry, restart, concurrent selection, expiry exclusion rules, and duplicate outbox prevention.
- [x] Open a review-only pull request for the static expiry package; do not deploy, merge, schedule, run migrations, or connect Redis in production.
- [ ] Obtain operating constraints: maximum tolerated expiry delay, expected concurrent-offer volume, and Redis durability/MISCONF status before choosing the future runner.
