# Phase 0B semantic evidence — Notification wrapper

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/notification/notification.service.ts:2–32`
- `src/modules/notification/notification.module.ts:2–10`

`NotificationService` is a thin wrapper over `NotificationsService`. Its `create` method accepts optional `user_id`, `role`, arbitrary `params/type/priority/action`, and raw `title_key/body_key`, then forwards the object without local validation or normalization (`notification.service.ts:8–19`). User listing, mark-one-read and mark-all-read also forward directly to the underlying service (`21–31`).

`NotificationModule` imports `NotificationsModule`, provides and exports this wrapper (`notification.module.ts:5–9`). The wrapper itself has no visible guards, DTOs, schema, rate limits, idempotency, audit or ownership logic; correctness depends entirely on the nested implementation already audited elsewhere.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unvalidated caller-controlled translation keys/params and routing metadata, duplicated abstraction with unclear ownership of authorization, and a contract surface whose security depends on hidden downstream behavior.
