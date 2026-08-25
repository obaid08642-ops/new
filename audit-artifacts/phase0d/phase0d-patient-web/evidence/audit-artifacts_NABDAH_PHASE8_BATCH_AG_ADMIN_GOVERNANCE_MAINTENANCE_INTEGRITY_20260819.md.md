# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AG_ADMIN_GOVERNANCE_MAINTENANCE_INTEGRITY_20260819.md`
- **Member SHA-256:** `2d3fbe21380e7485a4aab7111d76f28f3369740c68b3e49e6db72143b43e1fa3`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | Governance authorization | `AdminGovernanceController` now carries `@Roles(UserRole.ADMIN)`, making its maintenance, fraud-alert and audit-log routes subject to the central admin role boundary. |`
- `12: | Operator identity | The maintenance route receives the authenticated session context and no longer accepts or converts an `adminId` supplied by the browser. |`
- `15: | Build environment | The admin build was rerun without an inherited nonstandard `NODE_ENV`; that clean production environment completed all 34 static routes. The prior document/prerender symptom was environmental, not a source restoration `
- `25: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `28: | Branch upload | **PASS** — archive commit `91688ab` (`fix: fail closed unverified admin governance`) is pushed to `manus/on-live-reconciliation`. |`
- `32: No SLA value, maintenance mode, Redis value, fraud alert, audit log, admin session or production record was read or modified. This work does not create an emergency-maintenance capability. The owner must separately approve a runbook and imp`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AG: admin governance and maintenance integrity`
- `5: The administrative configuration portal displayed global SLA and emergency-maintenance controls that could report success without a verified infrastructure action. Its maintenance request supplied a fixed manager identifier in the browser, `
- `11: | Governance authorization | `AdminGovernanceController` now carries `@Roles(UserRole.ADMIN)`, making its maintenance, fraud-alert and audit-log routes subject to the central admin role boundary. |`
- `12: | Operator identity | The maintenance route receives the authenticated session context and no longer accepts or converts an `adminId` supplied by the browser. |`
- `14: | Admin portal | `config-portal` is an explicit unavailable governance surface. It no longer fetches/applies browser SLA overrides, triggers maintenance, displays state transitions, or includes the former `admin-master-001` identity. |`
- `15: | Build environment | The admin build was rerun without an inherited nonstandard `NODE_ENV`; that clean production environment completed all 34 static routes. The prior document/prerender symptom was environmental, not a source restoration `
- `24: | Admin configuration contract | **PASS** — 1/1, confirms removal of fixed manager identity and presence of unavailable operational state. |`
- `25: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `27: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `6f82690f60429dc095535fa052b9ab7d3442388c02fdc742eac152675f41c467`. |`
- `28: | Branch upload | **PASS** — archive commit `91688ab` (`fix: fail closed unverified admin governance`) is pushed to `manus/on-live-reconciliation`. |`
- `32: No SLA value, maintenance mode, Redis value, fraud alert, audit log, admin session or production record was read or modified. This work does not create an emergency-maintenance capability. The owner must separately approve a runbook and imp`
### state_transitions
- `5: The administrative configuration portal displayed global SLA and emergency-maintenance controls that could report success without a verified infrastructure action. Its maintenance request supplied a fixed manager identifier in the browser, `
- `14: | Admin portal | `config-portal` is an explicit unavailable governance surface. It no longer fetches/applies browser SLA overrides, triggers maintenance, displays state transitions, or includes the former `admin-master-001` identity. |`
- `15: | Build environment | The admin build was rerun without an inherited nonstandard `NODE_ENV`; that clean production environment completed all 34 static routes. The prior document/prerender symptom was environmental, not a source restoration `
- `24: | Admin configuration contract | **PASS** — 1/1, confirms removal of fixed manager identity and presence of unavailable operational state. |`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
