# Phase 0B semantic evidence — orders.idempotency.contract.spec.ts

**Archive member:** `src/modules/orders/orders.idempotency.contract.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–10; full 10-line member covered.

Line 2 imports OrdersController. Lines 4–10 define one contract test. The test reads metadata `REQUIRE_IDEMPOTENCY` from `OrdersController.prototype.reorder`, `reorderPartial`, and `cancel`, and expects it to be true.

**What this proves:** the controller methods carry the idempotency-required decorator metadata for the three named mutations.

**What this does not prove:** no HTTP request is made; no missing-key response/status is checked; no first-call/replay response equivalence is checked; no payload-conflict behavior is checked; no persistence side-effect count is checked; no owner/stranger/unauth/role test is present; no Redis/database failure, TTL, concurrent replay or cross-route key-scope test is present. The test also does not cover checkout, create-order, payment or any other mutation.

**Audit judgment:** This is metadata contract coverage, not end-to-end idempotency coverage. A green result cannot establish exactly-once behavior or financial/order truthfulness.

No product code was changed and no tests were executed during this semantic read.
