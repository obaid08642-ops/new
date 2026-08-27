# Project TODO

- [x] Define governed expiry fields and index strategy for pharmacy offers and broadcasts.
- [x] Implement the single idempotent `expireDuePharmacyOffers(now, cursor, limit)` command with bounded batches and a concurrency lease.
- [x] Add audit and transactional-outbox records for expiry outcomes without direct notification, refund, stock restoration, or payment cancellation.
- [x] Add rollback-safe Mongo migration artifacts and documented forward/rollback procedure without executing migrations.
- [x] Add local tests for retry, restart, concurrent selection, expiry exclusion rules, and duplicate outbox prevention.
- [x] Open a review-only pull request for the static expiry package; do not deploy, merge, schedule, run migrations, or connect Redis in production.
- [ ] Obtain operating constraints: maximum tolerated expiry delay, expected concurrent-offer volume, and Redis durability/MISCONF status before choosing the future runner.
- [x] Audit all open stacked pull requests, release branches, and source-tree application surfaces before extending production scope.
- [ ] Produce and approve a route, screen, API-action, state, and acceptance-criteria parity matrix for Patient Web and Patient Mobile.
- [ ] Close verified Backend contract and state-machine gaps required by the parity matrix, including wallet prohibition and capability-driven payment constraints.
- [ ] Implement missing Patient Web pharmacy and shared patient-flow screens with loading, empty, error, forbidden, and success states.
- [ ] Implement missing Patient Mobile pharmacy and shared patient-flow screens to the same approved functional contract.
- [ ] Verify Web/Mobile action parity, accessibility, authorization, idempotency, and responsive/native presentation against the accepted matrix.
- [ ] Split completed work into reviewable branches and pull requests, obtain CI evidence, and prepare an auditor-ready change ledger without self-merging or deploying.
- [ ] Remove the discovered in-process `setInterval` polling from Patient Mobile broadcast status and replace it with an explicit, user-driven refresh compatible with the governed expiry policy.
- [ ] Implement the governed pharmacy broadcast, offer comparison, patient selection, negotiation, final-quote, cash/COD, and insurance decision presentation in Patient Web; the current cart checkout is not a substitute for this flow.
- [ ] Inventory and eliminate all remaining `setTimeout` and `setInterval` uses from Patient Web and Patient Mobile where they drive business state, polling, payments, or expiry; retain no in-process lifecycle authority in patient clients.
- [ ] Inventory and govern all NestJS timer, cron, queue, worker, and expiry-writer paths; retain no in-process authority for pharmacy offer or broadcast expiry and defer new production runners until the operating decision is made.
