# Phase 0B semantic evidence — Operations safety, SLA escalation and penalties

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/operations-safety/operations-safety.module.ts:2–166`

`OperationsSafetyModule` defines cancellation penalties, per-domain SLA values, an admin controller and a service spanning five booking models plus provider matching (`operations-safety.module.ts:22–54`). `slaReport` scans up to 500 records per domain, maps raw states through the workflow engine and reports patient IDs, without visible pagination/completeness, invalid-state handling, tenant scope or clock/timezone policy (`56–81`).

`escalate` accepts caller body kind/threshold, scans pharmacy/nursing stuck records and returns `re-broadcast-requested` result objects but does not visibly mutate, enqueue or invoke a dispatch operation; threshold is not bounded and state matching is heuristic (`83–100`). `assessPenalty` derives fixed 30/50 amounts from caller-supplied dates and writes a penalty without visible policy version, payment/ledger binding, idempotency, duplicate constraint, grace/waiver or currency (`102–114`).

`fallback` delegates to workflow ranking and excludes a provider by either ID field, returning up to five broad provider objects; no visible current-booking context, capacity reservation, tenant scope or notification/assignment operation exists (`116–125`). Penalty list accepts raw status/patient filters and returns up to 100 records; controller is JWT+ADMIN metadata for SLA/escalate/assess/fallback/list but mutations have no visible idempotency or approval/audit boundary (`128–146`). Module wires workflow engine, five booking models, providers and penalty schema (`149–166`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: incomplete/bounded SLA coverage, false escalation success, caller-controlled penalty timing, non-idempotent penalty creation, fallback not equal to reassignment, broad provider/penalty disclosure and missing operational audit/approval semantics.
