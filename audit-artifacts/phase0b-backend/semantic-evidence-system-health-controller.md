# Phase 0B semantic evidence — Admin Web Core System Health

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/admin-web-core/controllers/system-health.controller.ts:2–27`

`SystemHealthController:3–27` has no visible `UseGuards`, role or internal-network restriction. `GET /system-health/liveness` returns a hard-coded `status: ok` and claims database, Redis and core API are connected/running without performing any dependency probe. `GET /system-health/readiness` likewise always returns `status: ok` with process uptime/timestamp and no configuration/dependency/readiness checks. The responses expose uptime/timing to any caller and do not distinguish liveness from readiness failure or degraded state.

## Findings candidates

The read supports: unauthenticated operational telemetry exposure, false health assertions, absence of dependency/readiness checks, and unsafe use as deployment/monitoring gates.

No product code was changed and no tests/builds were executed during this semantic read.
