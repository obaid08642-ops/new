# Phase 0B semantic evidence — B2B Controller

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/admin-governance/b2b.controller.ts:2–43`

`B2BController:8–13` has a JWT guard but no visible role, organization, procurement scope or maker-checker restriction. `GET /b2b/requests:15–22` queries and returns every B2B request sorted by submitted date without pagination, projection or tenant/provider scope. `POST /b2b/requests/:id/approve:24–32` and `POST .../reject:34–42` resolve by a raw `id`, change status directly, append a raw admin note into the document and return the full document. There is no visible current-state precondition, idempotency, optimistic version, actor/audit event, quote/price validation or organization ownership check. The source comment confirms mocks were removed, but does not establish operational controls.

## Findings candidates

The read supports: broad B2B request disclosure, weak admin authorization, raw note/PII handling, non-idempotent approval/rejection races, full-document return and absent workflow/audit/tenant controls.

No product code was changed and no tests/builds were executed during this semantic read.
