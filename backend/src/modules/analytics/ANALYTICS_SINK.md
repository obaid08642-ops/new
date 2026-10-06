# Analytics sink — ClickHouse / BigQuery migration guide (P22.10)

Reports MUST query through `AnalyticsSink` (`analytics-sink.ts`), never the
production domain collections. `AnalyticsEventService` holds the sink and all
funnel/retention reads go through `sink.count / sink.find / sink.aggregate`.

## Today (default): `MongoAnalyticsSink`

- Backed by the same Mongo connection but restricted to the
  `analytics_events` / `analytics_reports` collections.
- The sink interface is the seam: swapping stores = implementing
  `AnalyticsSink` (3 methods) and injecting it. No report code changes.

## ClickHouse (recommended for event scale)

```ts
export class ClickHouseAnalyticsSink implements AnalyticsSink {
  // table: analytics_events(event_type, domain, user_id, session_id, created_at, metadata_json)
  // aggregate() → POST /?query=... with a pipeline→SQL translator
  // count()     → SELECT count() WHERE ...
  // find()      → SELECT ... LIMIT n
}
```

- Provisioning: create database `nabd_analytics`, table above with
  `ORDER BY (created_at, event_type)`, TTL per retention policy, and a
  `MATERIALIZED VIEW` per funnel step for dashboards.
- Env: `ANALYTICS_SINK=clickhouse`, `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`.

## BigQuery alternative

- Dataset `nabd_analytics`, partitioned table `events` (`created_at` day
  partition, clustered by `event_type`), streaming inserts from the ingest
  path, scheduled queries for funnel/retention materialization.
- Env: `ANALYTICS_SINK=bigquery`, `BQ_PROJECT`, `BQ_DATASET`, `GOOGLE_APPLICATION_CREDENTIALS`.

## Status

`BLOCKED: warehouse provisioning needs owner infra decision` — the code seam
+ this doc ship now; the actual ClickHouse/BigQuery instance, credentials,
and backfill job are infra work for the owner.
