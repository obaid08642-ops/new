# Phase 0B semantic evidence — Admin Config Controller

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/admin-web-core/controllers/admin-config.controller.ts:2–28`

`AdminConfigController:4–6` uses `RolesGuard`, with method-level ADMIN roles on both routes. `GET /admin/config/sla:8–17` returns hard-coded consultation duration, ringing duration, JWT expiry and system status rather than reading an authoritative configuration source. `PUT /admin/config/sla:19–27` accepts `body:any`, explicitly comments that the real DB update is not implemented, and returns the body as success data without persistence or validation. No visible idempotency, versioning, audit, maker-checker, secret handling or range/currency/time-unit validation exists.

## Findings candidates

The read supports: static/stale SLA contract, raw config echo, false-success mutation, missing persistence and unsafe control-plane semantics despite the role guard.

No product code was changed and no tests/builds were executed during this semantic read.
