# Phase 0B semantic evidence — Custom service requests

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/custom-services/custom-services.service.ts:2–72`
- `src/modules/custom-services/custom-services.controller.ts:2–19`
- `src/modules/custom-services/custom-services.module.ts:2–15`

`CustomServicesController` applies JWT guard and exposes create, mine, detail, admin/provider list and admin status update routes (`custom-services.controller.ts:7–18`). The admin list route has no visible route-level `Roles` decorator; service `adminList` likewise accepts no actor argument. Status update accepts current user but does not visibly enforce provider/admin role, entity assignment or transition matrix.

Creation validates kind and Arabic name only, then persists user-derived patient identity plus raw doctor notes/name, prescription image, attachments, priority and an initial status history (`custom-services.service.ts:15–35`). It emits a created event and returns the complete document. Mine is patient scoped and bounded to 80; detail permits the patient, exact admin or any `isProviderRole` actor, without visible provider assignment/service-kind scope (`37–48`). Admin listing returns up to 200 broad documents (`50–56`). Status update accepts any enum value, appends history and writes arbitrary admin note, but uses read-then-save with no idempotency/current-state predicate and emits event after persistence (`58–70`).

The module registers the request schema/repository/service/controller (`custom-services.module.ts:8–15`). No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: unguarded admin/provider list, broad provider IDOR, raw PII/attachment storage, unvalidated priority/content, status transition/replay races and event truthfulness gaps.
