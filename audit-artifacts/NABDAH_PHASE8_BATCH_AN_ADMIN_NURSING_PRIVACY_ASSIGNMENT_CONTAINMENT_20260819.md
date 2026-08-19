# Phase 8 — Batch AN: admin nursing privacy and assignment containment

## Purpose

The nursing portal queried unassigned home-care bookings and rendered patient name, service type and address. It then accepted a browser `prompt()` value as a nurse/provider identifier and directly updated the booking assignment. The server only verified a profile existence; it did not establish eligibility, roster/facility scope, nurse acceptance, minimum-PHI view or an immutable assignment audit process.

## Source change

| Surface | Implemented control |
|---|---|
| Home-care request visibility | The admin nursing request list now returns `503` before querying home-care bookings or exposing patient/address fields. |
| Direct assignment | The assignment endpoint now returns `503` before resolving an arbitrary provider profile or updating a booking. |
| Browser portal | The portal is an explicit unavailable state; it does not load requests, display patient/address data or present a free-text nurse assignment action. |
| Scope preservation | Provider-side canonical home-care visit queue and response contracts were not made operationally different by this containment. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend nursing containment | **PASS** — 1/1, confirms read/assignment routes are fail-closed in source. |
| Backend regression suite | **PASS** — 64 suites, 364 tests. |
| Backend production build | **PASS** — `nest build`. |
| Admin source contracts | **PASS** — 5/5, including explicit nursing portal unavailability and no PHI/direct assignment claim. |
| Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `1ce6e65837caa87323273f0cc4584c7645ddec86d28f265fe0b77de213d75443`. |
| Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `de12598b1a3460ed86913d52c3d111132a96afe96f1502a9fe8c19003dfefd68`. |
| Branch upload | **PASS** — archive commit `64ab8dc` (`fix: contain ungoverned admin nursing operations`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No home-care request, address, patient identity, nurse/provider identity, assignment, notification or audit event was read, created or modified. This does not authorize or complete a nursing assignment workflow. Before reopening any admin operations, the owner must approve an eligible-provider/roster query, acceptance/reassignment rules, minimum-PHI scope, scheduling/location permissions, state transitions, patient/provider notifications and immutable audit requirements. Phase 11 must use reviewer-authorized sandbox data only.
