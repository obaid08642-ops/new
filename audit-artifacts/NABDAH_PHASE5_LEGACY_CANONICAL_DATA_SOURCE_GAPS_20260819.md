# Phase 5 Backend/Database — canonical and legacy data-source gaps

## Confirmed controls

The Backend contains an admin-protected, read-only legacy report and usage map. It does not delete collections as part of the report path. This is appropriate as an inventory mechanism.

## Confirmed risks

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Pharmacy orders, allocations and broadcasts deliberately coexist with canonical order/system-event state | `pharmacy_orders` runs alongside `orders`; allocation/broadcast side tables are bridged through mapping/event conventions. Multiple readers/writers remain active. | Establish a single canonical order state machine and transactional outbox/event projection; document one-way migration/rollback, reconcile all existing records and add cross-collection invariant tests for broadcast, partial fulfilment, assignment, cancel, payment and completion. |
| **P0** | Provider account profiles have an acknowledged duplicate schema slated for merge | `provideraccountprofiles` and `providerprofiles` are separately active with provider services reading/writing legacy profile data. | Freeze duplicate writes, select one canonical profile aggregate, backfill/verify parity with an auditable migration, switch readers atomically and retain a time-bounded read-only archive/rollback procedure. |
| **P1** | Legacy inventory uses estimated document counts only | `estimatedDocumentCount` is useful for overview but cannot prove record-level parity, orphan rate, state divergence or migration safety. | Produce exact reconciliation metrics keyed by stable IDs/state/version/time, including orphans, duplicates, mismatch repair plan and signed before/after report. |
| **P1** | Static usage map can drift from active code paths | Reader/writer lists are manually maintained and endpoint only describes selected collections. | Generate usage inventory in CI or add contract ownership manifests reviewed with every module/schema change. |

## Decision

Canonical/legacy coexistence is **P0 FIX/BLOCKED** for cross-app state truthfulness. No destructive migration is authorized until exact reconciliation, source-of-truth selection, invariant tests and rollback evidence are complete.
