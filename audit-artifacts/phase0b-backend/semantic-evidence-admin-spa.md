# Phase 0B semantic evidence — Admin SPA compatibility control plane

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/compat/admin-spa.module.ts:2–1362`

`AdminSpaModule` registers a broad admin-console compatibility surface using raw Mongo collections and repeated `JWT + @Roles(ADMIN)` metadata, with two explicitly shared routes (`delivery/check`, `promotions/applicable`) lacking the admin role (`admin-spa.module.ts:2–9,49–51,1317–1362`). Dashboard KPIs/alerts/live feed aggregate global users, providers, orders, appointments, SOS, complaints and insurance records, often returning raw-derived labels and counts with mixed collection/state naming and no visible freshness/tenant metadata (`53–109`). Broadcast config/campaign mutation, emergency dispatch, shift creation and provider master-data routes directly update records with raw bodies, no visible idempotency or state/assignment policy (`111–220`).

Scorecard/compliance/transport/family-cards/blacklist/fraud/admin lists expose broad administrative and PII-bearing records. Specialties list seeds a static Saudi list into an empty collection; services, complaints, CMS and banners return raw or lightly projected records, while banners accept arbitrary links/images (`222–495`). Orders reassign writes provider IDs directly and appends a synthetic same-state history entry. Financial summary aggregates order totals, refunds, copay and withdrawals across heterogeneous stores; commissions, refunds and coupons mutate financial policy/requests with raw values and no visible canonical ledger/approval/idempotency (`497–651`).

Loyalty config/rules, manual adjustments and redemption perform balance increment plus transaction insert separately; redemption reads balance before mutation, allowing concurrency overspend. Delivery rules/config are mutable raw policy and shared delivery check computes first matching rule without priority/version/quote binding (`653–824`). Promotions create/update/toggle/delete campaigns with raw prices/dates/target parameters and default `approved`; applicable offers filter caller-provided context. Notifications history exposes user IDs and message bodies; send and auto-rules write direct/broadcast records without durable delivery/idempotency (`827–989`).

Insurance claims decisions update request/history separately and compute copay from raw request price/body percentage; provider subaccount and medicine shortage routes expose/administer PII and catalog state. Bulk upload accepts CSV/body arrays, parses by comma splitting, then upserts medicines with raw price/stock/status; there is no content validation, dry-run, rollback, duplicate policy or import audit (`1007–1140`). Nursing listing accepts caller-supplied nurse ID without visible self/role restriction (`1142–1158`).

System config returns or stores arbitrary theme/permissions/workflows/AI/alert rules with generic admin role, no per-key authorization, schema, versioning, change approval or cache invalidation. Analytics aggregates global users/orders/appointments, city heatmaps and arbitrary allowlisted collections including triage/assessments; date parsing and metric definitions are not visibly validated. Admin nursing requests/assignment explicitly fail with `503 ServiceUnavailable`, making those admin workflows blocked rather than silently successful (`1160–1315`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: broad PII/topology exposure, raw admin mutations, financial non-atomicity, permission/config risks, seed-on-empty, promotion/delivery truthfulness gaps, unvalidated bulk ingestion, analytics inconsistency and explicitly blocked nursing operations.
