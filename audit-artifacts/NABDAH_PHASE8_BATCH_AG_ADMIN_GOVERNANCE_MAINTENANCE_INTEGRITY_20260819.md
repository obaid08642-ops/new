# Phase 8 — Batch AG: admin governance and maintenance integrity

## Purpose

The administrative configuration portal displayed global SLA and emergency-maintenance controls that could report success without a verified infrastructure action. Its maintenance request supplied a fixed manager identifier in the browser, while the Backend accepted that identifier directly, lacked explicit admin-role metadata, did not initialize Redis dispatch, and persisted a maintenance flag before declaring a platform-wide interruption or recovery.

## Source change

| Surface | Implemented control |
|---|---|
| Governance authorization | `AdminGovernanceController` now carries `@Roles(UserRole.ADMIN)`, making its maintenance, fraud-alert and audit-log routes subject to the central admin role boundary. |
| Operator identity | The maintenance route receives the authenticated session context and no longer accepts or converts an `adminId` supplied by the browser. |
| Infrastructure command | Because Redis dispatch, immutable audit attribution, two-person approval and post-change recovery verification are absent, `trigger-emergency-maintenance` now returns a fail-closed `503` **before any configuration write**. |
| Admin portal | `config-portal` is an explicit unavailable governance surface. It no longer fetches/applies browser SLA overrides, triggers maintenance, displays state transitions, or includes the former `admin-master-001` identity. |
| Build environment | The admin build was rerun without an inherited nonstandard `NODE_ENV`; that clean production environment completed all 34 static routes. The prior document/prerender symptom was environmental, not a source restoration issue. |

## Verification

| Gate | Result |
|---|---|
| Focused governance controller test | **PASS** — 1/1, asserts maintenance fails closed and `findOneAndUpdate` is never invoked. |
| Backend regression suite | **PASS** — 60 suites, 357 tests. |
| Backend production build | **PASS** — `nest build`. |
| Admin configuration contract | **PASS** — 1/1, confirms removal of fixed manager identity and presence of unavailable operational state. |
| Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `1a7a067eb1209d367941fcccf57f8d5992dd34ea595804cd27d217766332086e`. |
| Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `6f82690f60429dc095535fa052b9ab7d3442388c02fdc742eac152675f41c467`. |
| Branch upload | **PASS** — archive commit `91688ab` (`fix: fail closed unverified admin governance`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No SLA value, maintenance mode, Redis value, fraud alert, audit log, admin session or production record was read or modified. This work does not create an emergency-maintenance capability. The owner must separately approve a runbook and implementation providing authenticated operator identity, immutable audit events, dual-control policy, infrastructure dispatch, health confirmation and rollback/recovery verification. Phase 11 must test only reviewer-authorized sandbox behavior, including non-admin denial, command denial before configuration mutation, sensitive-log access control and audit trace requirements.
