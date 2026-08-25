# Phase 0B semantic evidence — System Health

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/system-health/system-health.controller.ts:2–38`
- `src/modules/system-health/system-health.module.ts:2–10`

`SystemHealthController` exposes `/system-health/liveness` and `/system-health/readiness` with no visible guard or `@Public` annotation in the controller (`system-health.controller.ts:5–37`). Liveness pings MongoDB and calls `redisService.getClient().ping()`, returning Terminus health output with Redis status (`13–27`). If `getClient()` is null or ping throws, the endpoint may throw rather than return a controlled health state. Readiness simply calls liveness, adds process uptime and explicitly mirrors liveness, so it does not distinguish process alive from dependencies ready (`29–37`).

The response reveals dependency names/status and uptime without visible perimeter policy, caching, rate limit, or separation between internal and public probes. Mongo/Redis are checked synchronously, creating potential amplification under probes. The module imports Terminus and Redis and registers only the controller (`system-health.module.ts:6–9`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unauthenticated internal health disclosure, readiness/liveness conflation, null/error failure mode, probe amplification, and missing public/private health contract governance.
