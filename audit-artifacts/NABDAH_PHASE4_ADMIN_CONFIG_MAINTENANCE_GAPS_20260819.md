# Phase 4 Admin Dashboard — configuration and emergency-maintenance gaps

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Emergency-maintenance Controller has no authentication/role guard | `AdminGovernanceController` declares neither JWT nor admin/permission enforcement on the kill-switch, fraud-alert or audit-log routes. | Apply explicit authenticated, privileged role/permission guards and deny-all negative tests; restrict emergency commands to approved break-glass roles. |
| **P0** | Kill-switch trusts caller-supplied admin identity and does not activate infrastructure flag | UI hard-codes `admin-master-001`; Controller writes it as `last_modified_by_admin_id` and Redis flag write is commented out. The UI can announce “all routes blocked” while no gateway flag is applied. | Derive actor from verified session, never body; implement an approved, tested atomic operational kill-switch with acknowledgement/health verification, immutable audit and safe rollback. |
| **P0** | SLA update UI shows success without checking HTTP response | `handleUpdateSLA` awaits the request but never tests `res.ok`/returned normalized config; failed/rejected persistence can be declared globally overridden. | Validate server response/version/effective time, show field-level error/rollback/retry and prohibit success until confirmed. |
| **P1** | Failed configuration load leaves dangerous client defaults eligible for overwrite | Fetch errors are console-only; default 15/45/24 values remain editable/savable even if current global settings are unavailable. | Render unavailable/read-only state and require fresh versioned config before mutation; enforce optimistic-concurrency/server ranges. |
| **P1** | Emergency control relies on two local checkboxes only | No step-up authentication, incident/case ID, second approver, maintenance window, impact checklist, reason, notification plan or confirmation of completion is captured. | Implement a policy-controlled break-glass state machine with justified ticket/incident, dual control as approved, short-lived step-up, scoped impact, notifications, audit and recovery validation. |
| **P1** | Fraud/audit comments make unsupported immutable/ABAC claims | Same unguarded Controller calls plain `find().limit(100)` despite claims of strict immutable/ABAC access. | Remove unsupported claims or implement read authorization, integrity evidence, retention, filters and viewer audit. |
| **P1** | Configuration interface is Arabic/raw and lacks safe accessible high-risk treatment | Copy, alerts and outcomes are mostly raw Arabic/English and not six-language/RTL-LTR tested. | Deliver reviewed six-language accessible policy and high-risk-action UI after controls are implemented. |

## Decision

Admin configuration and maintenance control is **P0 FIX/BLOCKED**. The current implementation must not be used to alter production SLA or emergency platform availability.
