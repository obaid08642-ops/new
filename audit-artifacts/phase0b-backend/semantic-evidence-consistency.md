# Phase 0B semantic evidence — Consistency audit and reconciliation

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/consistency/consistency.module.ts:2–187`

`ConsistencyService` audits five booking collections for duplicate-ish bookings, orphan owners, state/event mismatches, missing birth events and stuck matching/broadcast records (`consistency.module.ts:21–124`). Duplicate detection groups by patient/provider/kind/day and excludes only literal `CANCELLED`; it is heuristic and may flag legitimate multiple services or miss domain-specific overlap. Orphan and event checks inspect bounded samples/limits, use raw IDs and no tenant/scope metadata (`34–109`). Stuck detection covers only orders/home-care and matches broad state regexes (`111–120`).

`reconcile` reruns audit and emits missing `service.requested` events one by one, swallowing failures; there is no visible event uniqueness/idempotency or durable retry result (`126–137`). `fixOrphans` defaults to dry-run, but when `dryRun=false` it updates each model separately to CANCELLED and appends state history without current-state predicate, payment/refund handling, downstream notification or transaction (`139–157`).

The controller is JWT+ADMIN guarded and exposes audit/reconcile/fix-orphans, with dry-run controlled by a query string (`160–168`). The module wires all booking/event/user models and workflow engine (`170–187`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: bounded-sample false negatives, heuristic duplicate/state detection, event reconciliation duplication, orphan auto-cancel financial/state side effects, dry-run ambiguity and incomplete domain coverage.
