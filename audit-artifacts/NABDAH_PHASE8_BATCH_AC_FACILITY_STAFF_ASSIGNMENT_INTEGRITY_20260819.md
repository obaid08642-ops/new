# Phase 8 — Batch AC: facility staff-assignment integrity

## Purpose

The Backend route `POST /provider/requests/:id/assign-staff` accepted any client-provided `staff_id` after only checking request ownership. It did not verify that the person belonged to the facility, was active, or represented an authorized roster member. This allowed cross-facility identity assignment and left no explicit staff-assignment audit record.

## Source change

| Surface | Implemented control |
|---|---|
| Roster authority | Assignment now resolves `staff_id` exclusively from the existing `ProviderOperator` directory with exact `provider_account_id` matching the request facility and `status: active`. |
| Fail-closed behavior | A missing staff ID, foreign facility staff ID, disabled/invited/revoked operator, or non-existent operator is rejected with `staff_not_in_active_facility_roster`; the request remains unchanged. |
| Assignment record | The request stores the roster ID and server-known display name, plus assignment time. Notes are length-limited. |
| Audit evidence | Every successful assignment writes a `request.staff_assigned` audit record including the prior staff identity and the immutable roster identity used for the new assignment. |
| Provider app surface | No Provider UI currently calls the direct assignment route; therefore no free-text UI consumer is retained. Any future UI must consume a roster endpoint and submit an operator ID—not a typed name—before this endpoint will accept it. |

## Verification

| Gate | Result |
|---|---|
| Focused facility staff-assignment suite | **PASS** — 2 tests: active same-facility operator assignment and foreign/inactive rejection. |
| Full Backend regression suite | **PASS** — 57 suites, 348 tests. |
| Backend production build | **PASS** — `nest build`. |
| Archive integrity | **PASS** — rebuilt Backend archive validates with `unzip -tq`; dependencies and build outputs are excluded. |
| Backend archive SHA-256 | `9cbd7940c77af8a0576ab61cbb13e2eda58a49755477505e35082d449565514d` |
| Branch upload | **PASS** — source commit `6004620` (`fix: validate facility staff assignments`) is on `manus/on-live-reconciliation`. |

## Acceptance limits

No facility operator, provider request, roster membership, or production data was altered. A roster list UX is intentionally not fabricated because no current Provider app route consumes this assignment surface. Phase 9 must add an explicit typed roster contract if the app introduces assignment UI; Phase 11 must validate linked sandbox hospital/clinic admin, active operator, invited/disabled operator, cross-facility operator, audit trail and request-state lifecycle after deployment approval.
