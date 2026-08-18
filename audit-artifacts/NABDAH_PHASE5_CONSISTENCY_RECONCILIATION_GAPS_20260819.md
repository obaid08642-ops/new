# Phase 5 Backend/Database — consistency and reconciliation gaps

## Confirmed strengths

The consistency module is admin-protected, defaults orphan repair to dry-run, and separately identifies duplicate-like records, missing owners, missing normalized events and stuck matching states. This is a valuable audit foundation.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Orphan “fix” directly cancels bookings outside the unified workflow and financial/clinical side-effect contracts | `fixOrphans(false)` uses `updateOne` to set `state/status: CANCELLED` and appends history, without `WorkflowRuntimeEngine`, normalized cancellation event, refund/insurance/payment/slot/inventory/reassignment handling or patient-data retention review. | Replace direct mutation with a governed remediation state machine that evaluates ownership/deletion legality, financial/insurance/inventory/slot effects, emits durable events and requires reviewed approval for every destructive result. |
| **P1** | Audit window and result caps cannot establish full-database integrity | It audits only 30 days and samples many collections at 200/500 records, then truncates issue lists. | Run partitioned/cursor-based exact reconciliation across the full retention window with checkpoint/progress, signed totals and clear scope/coverage metadata. |
| **P1** | Duplicate detector can classify valid appointments as duplicates | Grouping is patient + provider + kind + created day, without service, scheduled slot, request lineage, payment/idempotency key, status or intended repeat-care context. | Define duplicate identity per domain and verify against idempotency/schedule/service/patient intent before raising/remediating a case. |
| **P1** | Reconciliation backfills only birth events and suppresses failures | `reconcile` announces missing `service.requested` events with system actor and silently skips failures; it does not reconcile state transitions, owner context, event ordering or delivery proof. | Use versioned event backfill with source facts, durable outbox, failure queue/retry/report and state/event ordering checks. |
| **P1** | Stuck-work detection covers only pharmacy and nursing | Labs, radiology and consultations have no equivalent matching/assignment/stall detection despite unified lifecycle claims. | Implement domain-specific stale-state policy and escalation for every service, including payment/insurance waits, provider assignment, report review and no-show. |

## Decision

Consistency tooling is **FIX/BLOCKED** as an automated repair mechanism. It may remain read-only for audit, but no non-dry-run repair is release-safe until cross-domain effects, coverage, evidence and approvals are implemented.
