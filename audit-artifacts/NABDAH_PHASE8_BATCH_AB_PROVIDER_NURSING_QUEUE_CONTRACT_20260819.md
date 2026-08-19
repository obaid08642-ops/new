# Phase 8 — Batch AB: Provider nursing queue contract integrity

## Purpose

The Provider nursing dashboard loaded a nonexistent `/nursing/jobs/active` endpoint and posted acceptance/rejection to nonexistent `/home-care/bookings/:id/respond` paths. The live Home Care contract exposes `/home-care/visits` and `/home-care/visits/:id/respond`. On the Backend, accepting a visit directly changed state without the canonical workflow engine, while the nursing workflow map lacked several real Home Care domain states.

## Source change

| Surface | Implemented control |
|---|---|
| Provider queue | Nursing orders load from the authenticated `/home-care/visits` queue. The display distinguishes `NEW_REQUEST` from active server states instead of relying on an assumed `PENDING`-only shape. |
| Provider accept/reject | Both actions call `/home-care/visits/:id/respond`. No local accepted state is written; refresh/back happens only after the server response. |
| Backend acceptance | A provider can accept only an unassigned `NEW_REQUEST` visit. Acceptance is applied by `WorkflowEngineService`, binds the authenticated provider and emits the state history atomically within the workflow mutation. |
| Backend rejection | A rejection is recorded as a non-terminal offer decision while keeping the visit unassigned and in `NEW_REQUEST`; it cannot alter an already-confirmed visit. |
| Workflow map | The nursing domain recognizes `NEW_REQUEST`, `IN_TRANSIT`, `ARRIVED`, `CARE_IN_PROGRESS`, `NO_SHOW` and `ESCALATED_EMERGENCY`, preventing unknown-state handling from silently coercing Home Care lifecycle values. |

## Verification

| Gate | Result |
|---|---|
| Focused Home Care controller + workflow suites | **PASS** — 8 tests. |
| Full Backend regression suite | **PASS** — 56 suites, 346 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release-contract suite | **PASS** — 1 suite, 14 tests. |
| Provider TypeScript check | **PASS** — `npx tsc --noEmit`. |
| Provider production Expo web export | **PASS**. |
| Archive integrity | **PASS** — rebuilt Backend and Provider archives validate with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `58a6b0a66ce805e3a7db4abbf4e0b2fdc87ca82361c089e75656000d9e8cd0d3` |
| Provider archive SHA-256 | `9ac67df5983d83f8d74bc824b76f5f6f767af215e5c91e67ecf14beac9cb7294` |
| Branch upload | **PASS** — source commit `fe47ed2` (`fix: align nursing queue workflow`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

This batch does not create a nursing visit, accept an order, track GPS, complete care or touch production data. Phase 11 must validate a linked sandbox patient/nursing provider lifecycle across queue → accept → transit → arrive → care → report → complete, rejection/reassignment/no-show, foreign-provider denial, notification generation, private visit evidence and map/GPS behavior. The four legal/product contracts remain fail-closed.
