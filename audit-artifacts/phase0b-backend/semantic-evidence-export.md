# Phase 0B semantic evidence — Export

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/export/export.service.ts:2–64`
- `src/modules/export/export.controller.ts:2–48`
- `src/modules/export/export.module.ts:2–10`

`export.service.ts:9–37` accepts a model name and fields, resolves an arbitrary Mongoose model from the shared connection, calls `find().lean()` without filter/projection pagination or row cap, and builds a full in-memory CSV. It escapes quotes/commas/newlines but does not neutralize spreadsheet formula prefixes or validate field/model allowlists. `:40–63` exports Users, Appointments, Orders, Transactions and AuditLogs, including names, phone, email, patient/doctor IDs, amounts, IP/user-agent and other sensitive operational fields. `export.module.ts:5–10` wires only service/controller.

`export.controller.ts:7–10` applies JwtAuthGuard and a DATA_EXPORT permission decorator to all routes, but no visible explicit role/scope/tenant/row-level ownership or export audit is present. `:13–16` sends CSV with a filename header not visibly sanitized/quoted. `:19–47` exposes five GET export routes; service methods have no requester context, so permission alone controls an unfiltered database-wide export.

## Findings candidates

The read supports: database-wide PII/financial/audit export under coarse permission, unrestricted model/data volume and memory exhaustion, CSV formula injection, arbitrary field/model capability if reused, lack of export audit/retention/secure delivery and filename/header hardening.

No product code was changed and no tests/builds were executed during this semantic read.
