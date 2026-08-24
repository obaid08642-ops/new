# Phase 0B semantic evidence — provider-scoring.service.ts

**Archive member:** `src/modules/provider/services/provider-scoring.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–107; full 107-line member covered.

Lines 2–21 import score/request/assignment schemas and repositories, define provider-role assertion, and inject score snapshot, request and assignment-attempt repositories. Lines 23–75 recompute a provider score from all-time request counts and assignment response times. It counts total, accepted/in-progress/completed, rejected, cancelled, and attempts with response timestamps. Acceptance rate uses accepted divided by accepted+rejected; completion rate uses completed divided by accepted. Average response seconds is computed from response minus sent timestamps. Reliability is a rounded composite of 50% acceptance, 30% completion, and a 20% response-speed bonus capped at 600 seconds. The snapshot is upserted with counts/rates/timestamps.

Lines 77–82 return the current provider snapshot, recomputing if absent. Lines 84–90 batch-load scores for arbitrary ID arrays and map them by provider account ID without caller context. Lines 92–96 recompute after lifecycle events but swallow all errors. Lines 98–106 find the latest pending assignment attempt for request/provider, mark its status and response time, optionally store rejection reason and save; absent attempts are silently ignored.

**Security/ownership:** `getMy` enforces provider role and own account ID. `getForIds` accepts arbitrary provider IDs without authorization in this member; safety depends on internal caller boundary. `recompute` and `onLifecycleEvent` also accept arbitrary provider IDs. No tenant/provider existence validation is visible.

**Truthfulness/fairness:** all-time metrics mix historical periods and potentially changed operating conditions. The score formula is hard-coded and lacks version, weighting provenance, minimum sample threshold, confidence interval, decay, dispute/quality signals, clinical outcomes or fairness review. Missing response data yields zero average and zero speed bonus, while one fast attempt can influence a small sample substantially. Accepted includes in-progress/completed, and completion is divided by accepted, allowing timing/data anomalies.

**Integrity/reliability:** snapshot upsert is not visibly versioned or transactionally tied to the request transition that triggered it. Lifecycle errors are swallowed, so the score may be stale without alerting. Assignment response marking is read-modify-save without CAS/idempotency; concurrent callbacks can overwrite timestamps/status or duplicate semantics.

**Price/payment/insurance source:** none visible.

**Test implications:** require role/tenant tests for arbitrary ID paths, formula/version/rounding tests, zero/small sample and anomaly cases, period/decay policy, concurrent snapshot recomputation, lifecycle failure alerting, attempt CAS/idempotency, and auditability of score changes. No tests executed during this semantic read.
