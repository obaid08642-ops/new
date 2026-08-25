# Phase 0B semantic evidence — Operations Center

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/ops/ops.controller.ts:2–173`
- `src/modules/ops/ops.module.ts:2–12`

`OpsController` is JWT guarded and restricted by `@Roles(ADMIN, SUPER_ADMIN)` at class level (`ops.controller.ts:15–18`). `overview` scans Redis `presence:*` and `sessions:*` with SCAN up to 10,000 keys, counts online users/admin sessions, reads daily request/status hashes, and aggregates multiple Mongo collections for pipelines. It also returns recent system events with actor/entity identifiers (`24–115`). Several database aggregates/queries load all statuses or recent records without visible time/index bounds, while exceptions are converted to empty pipeline results (`75–102`).

`requests` accepts optional kind and bounded limit 1–100, but fetches each selected collection with a limit per collection, normalizes statuses from hard-coded lists and exposes created-by IDs and human-readable names/summaries (`118–158`). It uses `_id` as the public item ID even though domain records may use string IDs. `traffic` accepts a regex-shaped date or defaults to today, returns Redis hashes for arbitrary dates without enforcing the documented 14-day range (`161–173`).

`OpsModule` registers the controller and a global `MetricsInterceptor` (`ops.module.ts:6–12`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: admin PII/identifier exposure, Redis key scanning load, unbounded/all-time aggregation, silent degraded dashboards, status taxonomy drift, ID leakage, arbitrary traffic date access and interceptor-wide observability coupling.
