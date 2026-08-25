# Phase 0B semantic evidence — Root health controller

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/health.controller.ts:1–59`

`HealthController` exposes three public endpoints: root `GET /`, `GET /health/liveness`, and `GET /health/readiness` (`14–33`). The root response publicly discloses the application name and a fixed version string `1.0.0` (`16–22`), while liveness always returns `{status:'up'}` without checking event-loop or process health (`25–29`).

Readiness checks Mongo `readyState === 1` and Redis `ping() === 'PONG'`, swallowing all exceptions, then returns `status:'ok'` or `'degraded'` with database details and process uptime (`31–57`). It does not set a non-2xx HTTP status when dependencies are down, has no timeout/deadline around Redis ping, no dependency latency, queue/worker/critical service check, startup grace period, cache readiness or version/build identifier. Because the endpoint is public, it exposes dependency health topology (`53–56`) and can be used for probing; no rate limit, access policy or redaction is visible in this member. No product code was changed and no tests/builds were executed during this semantic read.
