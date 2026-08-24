# Phase 0B semantic evidence — orders/dispatch.service.ts

**Archive member:** `src/modules/orders/dispatch.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–196; full 196-line member covered.

Lines 10–27 define DispatchService with hard-coded radius ladder `[3,7,10,15]`, injected ProviderProfileRepository, PharmacyInventoryRepository and EventEmitter2. The event emitter is injected but not used in this member. Lines 29–39 implement Haversine distance with no visible coordinate bounds or NaN handling.

Lines 41–57 query all active pharmacy providers with a location latitude, project only `_id`/`__v` out, then calculate distance in memory. The query requires `location.lat` but not `location.lng`; the mapper rejects falsy coordinates, which treats 0 as missing. Provider records are returned through `provider` objects in candidate responses, creating potential PII/metadata disclosure unless upstream repository projection is safe. No database geospatial query/index or tenant/public projection is visible.

Lines 59–65 query inventory by `pharmacy_id`, medicine IDs and `is_available: true`, then map medicine_id to stock_qty. Duplicate inventory rows overwrite earlier values. No quantity validation, pharmacy ownership proof, expiry/batch selection, reservation or transaction exists.

Lines 67–140 implement dispatch. Input medicine IDs and quantities are accepted without visible nonempty, integer, positive or duplicate checks. It expands the radius until a candidate can fulfill at least one item. Candidates score `available_count * 100 - distance`, so the algorithm maximizes count of fully satisfied line items, not quantity, clinical priority, price, delivery SLA or exact completeness. It uses `provider.user_id` as pharmacy identity while the queried model is ProviderProfile-shaped, requiring identifier mapping proof.

For each candidate, inventory is read independently and concurrently with `Promise.all`; no snapshot or reservation is held. The first pharmacy with any available item is returned, even when missing items remain. `attempts` stores timestamps/candidate metadata and is returned to the caller. Candidate and best-candidate records expose distance/scoring values; no redaction or server-side contract shaping is shown.

Lines 142–173 implement dispatchSplit with the same read-before-write inventory race and hard-coded scoring. `excludePharmacyIds` is client/caller supplied with no validation shown. It returns the next candidate able to satisfy at least one remaining item, not necessarily a globally optimal or complete split. Failure uses radius_used 0 rather than the last attempted radius, an observability/truthfulness inconsistency.

Lines 175–183 implement deductStock with one unguarded `updateOne` per item and `$inc stock_qty: -qty`; it does not require stock_qty≥qty, `is_available`, an order/line id, a version, or idempotency key. Partial failure can leave a partially deducted order, concurrent requests can oversell, and retries can double-deduct. It sets `last_restocked_at` during deduction, which is semantically incorrect and corrupts inventory restock history.

Lines 185–195 implement restoreStock with basic input checks, then one unguarded increment per item. It has no order/refund/cancellation idempotency, upper-bound/capacity, prior-deduction proof, transaction or audit link. Replays can inflate stock and partial failure can restore only some lines.

**Confirmed findings:** non-atomic inventory reads/writes and missing conditional stock decrement; replay/double deduction and replay/double restore; misleading last_restocked_at mutation; hard-coded dispatch policy; weak input validation; identifier ambiguity; potential provider data disclosure; unused event emitter; and incomplete split semantics.

**Test implications:** require coordinate/quantity/duplicate validation; safe public provider projections; identifier mapping; inventory snapshot/reservation; atomic conditional decrement and compensation; order-key idempotency; concurrent dispatch/checkout; split completeness/optimization; cancellation restore exactly once; partial-failure recovery/outbox; and candidate-output redaction tests. No tests executed during this semantic read.
