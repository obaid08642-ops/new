# Phase 0B semantic evidence — Operations metrics interceptor

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/ops/metrics.interceptor.ts:1–55`

`MetricsInterceptor` counts HTTP requests by normalized path and status class into daily Redis hashes, with a documented 14-day retention (`5–10,24–52`). Path normalization replaces UUIDs, 24-character hex IDs and long numeric segments, then truncates to 180 characters (`15–21`); it does not visibly remove query strings in the fallback `req.url`, normalize non-hex identifiers, route templates, encoded values or malicious high-cardinality strings. It also records the normalized path as a Redis hash field, without tenant, actor, method or correlation dimensions.

Each response performs three `HINCRBY` operations plus two expiry operations in a Redis multi pipeline (`33–44`). The Redis client is obtained through an `any` cast and optional call; missing client, pipeline errors and exceptions are silently ignored (`33–45`). Telemetry therefore has no durable delivery/health signal and can be disabled without alerting. The pipeline has no visible bounded retry, queue/backpressure, command timeout, cardinality cap, memory budget or atomicity/error interpretation contract. Status is classified from response status/error status, but method, route ownership, tenant, actor and sensitive endpoint categories are not represented (`37–52`). No product code was changed and no tests/builds were executed during this semantic read.
