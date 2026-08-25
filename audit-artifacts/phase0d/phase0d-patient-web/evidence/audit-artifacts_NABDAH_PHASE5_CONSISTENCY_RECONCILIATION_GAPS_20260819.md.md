# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_CONSISTENCY_RECONCILIATION_GAPS_20260819.md`
- **Member SHA-256:** `b62df038e469f48cdf4ebd1ce9253193174a9613f89cd60de7ad99bdfa7f2330`
- **Line count:** 19
- **Read range:** `1-19`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntim`
- `14: | **P1** | Reconciliation backfills only birth events and suppresses failures | `reconcile` announces missing `service.requested` events with system actor and silently skips failures; it does not reconcile state transitions, owner context, `
### backend_consumers_or_contracts
- `11: | **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntim`
- `15: | **P1** | Stuck-work detection covers only pharmacy and nursing | Labs, radiology and consultations have no equivalent matching/assignment/stall detection despite unified lifecycle claims. | Implement domain-specific stale-state policy and`
### auth_ownership
- `5: The consistency module is admin-protected, defaults orphan repair to dry-run, and separately identifies duplicate-like records, missing owners, missing normalized events and stuck matching states. This is a valuable audit foundation.`
- `11: | **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntim`
- `14: | **P1** | Reconciliation backfills only birth events and suppresses failures | `reconcile` announces missing `service.requested` events with system actor and silently skips failures; it does not reconcile state transitions, owner context, `
### state_transitions
- `3: ## Confirmed strengths`
- `5: The consistency module is admin-protected, defaults orphan repair to dry-run, and separately identifies duplicate-like records, missing owners, missing normalized events and stuck matching states. This is a valuable audit foundation.`
- `7: ## Confirmed defects`
- `11: | **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntim`
- `13: | **P1** | Duplicate detector can classify valid appointments as duplicates | Grouping is patient + provider + kind + created day, without service, scheduled slot, request lineage, payment/idempotency key, status or intended repeat-care con`
- `14: | **P1** | Reconciliation backfills only birth events and suppresses failures | `reconcile` announces missing `service.requested` events with system actor and silently skips failures; it does not reconcile state transitions, owner context, `
- `15: | **P1** | Stuck-work detection covers only pharmacy and nursing | Labs, radiology and consultations have no equivalent matching/assignment/stall detection despite unified lifecycle claims. | Implement domain-specific stale-state policy and`
### payment_insurance_relevance
- `11: | **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntim`
- `12: | **P1** | Audit window and result caps cannot establish full-database integrity | It audits only 30 days and samples many collections at 200/500 records, then truncates issue lists. | Run partitioned/cursor-based exact reconciliation acros`
- `13: | **P1** | Duplicate detector can classify valid appointments as duplicates | Grouping is patient + provider + kind + created day, without service, scheduled slot, request lineage, payment/idempotency key, status or intended repeat-care con`
- `15: | **P1** | Stuck-work detection covers only pharmacy and nursing | Labs, radiology and consultations have no equivalent matching/assignment/stall detection despite unified lifecycle claims. | Implement domain-specific stale-state policy and`
- `19: Consistency tooling is **FIX/BLOCKED** as an automated repair mechanism. It may remain read-only for audit, but no non-dry-run repair is release-safe until cross-domain effects, coverage, evidence and approvals are implemented.`
### error_empty_loading_retry_cancel
- `11: | **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntim`
- `14: | **P1** | Reconciliation backfills only birth events and suppresses failures | `reconcile` announces missing `service.requested` events with system actor and silently skips failures; it does not reconcile state transitions, owner context, `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
