# Runbook: overload (R16 level 1 / 2, `server_busy` 503s)

**Alerts:** `OverloadStrained` (level >= 1 for 5 min, warning), `OverloadShedding` (level 2 for 2 min, critical). Design: `docs/platform/R16-load-priority.md`.

## What the platform is doing on purpose
- Level 1: admin report reads are refused; recommendations, nudges, analytics ingestion and search suggestions are switched off.
- Level 2: also search, public reads, user reads and other reads answer `503 server_busy` + `Retry-After`; live map and AI are off.
- Payments, sign-in, bookings and calls are never refused by this mechanism. If they fail, it is something else: `checkout-failures.md`, `api-availability.md`.

## Diagnose (5 minutes)
1. Is it real traffic or a stuck dependency? `nabd_http_requests_total` rate vs the usual; `nabd_event_loop_lag_ms`, `nabd_heap_used_bytes`.
2. `nabd_admission_low_inflight` at the budget (48) with a normal request rate = slow handlers (database or an outside call), not volume. Find them: `nabd_http_class_p95_ms` per class, then `slow-api.md`.
3. `nabd_admission_rejected_cap_total` vs `nabd_admission_rejected_level_total`: caps = too many slow reads at once; level = the loop or heap is strained.
4. Host: memory (`98-memory-report` task), mongod restarts (`96b-mongodb-restarts`), Redis. The 2026-11-02 incident was a memory cgroup, not traffic.

## Mitigate
- Stuck dependency: fix or kill the slow query (mongo `currentOp`), restart only the container that is stuck (`docker compose restart api`), never the database first.
- Real traffic spike: nothing to do, the shedding is the mitigation; confirm payments are healthy (`class="payment"` p95 and errors). Raise `LOW_PRIORITY_MAX_INFLIGHT` only if CPU and DB are idle while rejecting (it is a proposal, not a measured value).
- A feature needed during level 1/2 (e.g. admin report for an incident): use the console after the level drops, or ask for a kill-switch review; do not disable the governor.

## Verify
`nabd_overload_level` is 0 for 30 minutes (the governor itself waits 30 s of calm per level), rejected counters stop growing, p95 per class under target.

## Afterwards
Write the incident note (`incident-checklist.md`). If the 503s reached users for more than a few minutes, tell support.
