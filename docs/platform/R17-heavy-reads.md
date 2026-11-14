# R17 — heavy reads off the primary

## What was built
`backend/src/common/reports/report-read.ts`:
- **`reportAggregate(conn, collection, pipeline)`**: same call shape as `conn.collection(c).aggregate(p)` (returns the cursor). Adds `readPreference` (`REPORT_READ_PREFERENCE`, default `secondaryPreferred`), `maxTimeMS` (`REPORT_MAX_TIME_MS`, default 20 000, minimum 1000) and `allowDiskUse`. On today's single node `secondaryPreferred` falls back to the primary, so behaviour is unchanged; when a secondary exists the reports go to it with no code change.
- **Dedicated analytics member**: if `MONGO_ANALYTICS_URI` is set (the hidden/analytics member from R7, which normal clients cannot see), a second connection (pool 6, `readPreference=secondary`, appName `nabd-analytics`) is opened lazily. While it is still connecting, or if it is down, the application connection answers. Nothing here creates that member (R7 standby needed first).
- **`cachedReport(conn, key, params, ttlSec, compute)`**: precomputed snapshots in `report_snapshots` (`_id = key:hash(params)`). Inside the TTL the report is read from the snapshot (no aggregation). After it, one caller per process recomputes and the others in that process wait for the same promise. If the recompute fails the last good snapshot is served with `_snapshot.stale = true`; never one older than `REPORT_STALE_MAX_SEC` (24 h). Snapshots expire by TTL index; a result above `REPORT_SNAPSHOT_MAX_BYTES` (8 MB) is returned but not stored.

## Where it is applied
- `analytics-suite.service.ts`: all 7 aggregations use `reportAggregate`; `funnel`, `cohorts`, `providerLeague`, `searchAnalytics`, `nps` are served through `cachedReport` (`REPORT_TTL_SEC`, default 300 s). The response gains a `_snapshot: {computed_at, stale}` field. `anomalies` (45 days of series) is left as is.
- `finance-suite.service.ts`: 4 report aggregations (refunds, wallet refunds, gateway, per-kind totals).
- `orders-console.service.ts`: the 2 count/facet aggregations.
- Deliberately left on the primary: the withdrawals state totals (money workflow, an operator acts on it right after a change) and every transactional or user-facing read.

## Metrics
`nabd_report_aggregates_total`, `nabd_report_snapshot_hit_total`, `nabd_report_snapshot_miss_total`, `nabd_report_snapshot_stale_total`.

## Not done / honest limits
- Ranking (`product-ranking`, `refreshCategoryPositions`) is a write job, not a read: left as is.
- Snapshots are per `(report, params)`; the same period asked by different admins shares one. Coalescing is per process, not cluster-wide, so with two API replicas a cold key can be computed twice.
- A secondary can lag: report numbers can be a few seconds behind. Acceptable for analytics, which is why money workflows stay on the primary.
- No measured gain: there is no secondary yet and no load run (R6). The effect today is the `maxTimeMS`/`allowDiskUse` guard plus the 5-minute snapshot, which removes repeated aggregation when several admins open the same dashboard.
- Precomputing by cron (instead of read-through) is not done: the first viewer after a TTL pays the aggregation.
