# Phase 8 — Batch AE: ambulance emergency-record integrity

## Purpose

The prior ambulance workflow allowed an emergency record to be claimed and location-tracked without a verified, explicit vehicle binding. The claim code wrote the authenticated provider identifier into `assigned_ambulance_id`, which conflated a human/provider identity with the dispatch asset responsible for a safety-critical case. In parallel, shared provider SOS/GPS screens exposed generic dispatch actions to roles that cannot supply a verified ambulance identity.

## Source change

| Surface | Implemented control |
|---|---|
| Backend claim | `EmergencyService.claim()` now requires `vehicle_id`; it looks up an **approved, available vehicle owned by the authenticated provider** and fails closed with `400` when absent and `403` when the asset cannot be verified. |
| Emergency record | A successful claim stores the verified vehicle in `assigned_ambulance_id`, retains the authenticated provider separately in `assigned_provider_id`, and uses the vehicle’s server-backed label. The caller ID is never treated as a vehicle ID. |
| Mission list | `driverMissions()` exposes only the caller’s approved available fleet for selection, alongside missions assigned to that provider. |
| Location tracking | `updateUnitLocation()` requires `vehicle_id`, verifies the same approved fleet ownership and requires the vehicle to match the incident’s `assigned_ambulance_id` before storing location. |
| Controller boundary | Claim and tracking controllers forward only the submitted `vehicle_id` to the service boundary; authorization remains server-owned. |
| Ambulance dashboard | The provider selects an approved vehicle before accepting a pool mission; the selected or assigned vehicle ID is submitted for claim and tracking. A provider without an approved vehicle sees an explicit unavailable state rather than a claim action. |
| Shared provider SOS/GPS | `SosDispatchScreen` and `GpsRouterScreen` are explicitly **fail-closed** outside the dedicated ambulance workflow. They cannot trigger, list, claim, route, or broadcast emergency location for a general provider. |

## Verification

| Gate | Result |
|---|---|
| Focused emergency vehicle-integrity spec | **PASS** — 3/3 assertions: missing `vehicle_id` rejects, foreign/unapproved vehicle rejects, and valid claims bind the verified vehicle plus authenticated provider. |
| Backend regression suite | **PASS** — 58 suites, 351 tests. |
| Backend production build | **PASS** — `nest build`. |
| Provider release contracts | **PASS** — 15/15, including selected vehicle propagation for claim and location tracking. |
| Provider TypeScript | **PASS** — `npx tsc --noEmit`. |
| Provider production web export | **PASS** — Expo web bundle completed. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `9a5c34e289ef81207dcfef50f369e1e8a9f39866b03336347923fa96c8572293`. |
| Provider archive integrity | **PASS** — `unzip -tq`; SHA-256 `d9186f74f0f1eee8ebbc2beb6d9a31f6c20b129357de16ee9e07b1a91efc6bc0`. |
| Branch upload | **PASS** — archive commit `ad4fcae` (`fix: bind ambulance emergency records to verified vehicles`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No live emergency, vehicle, location, dispatch, patient, or provider record was created or altered. This is a source-level containment and regression result, not a declaration that emergency dispatch is production-authorized. SOS, QR, consent and location contracts remain **fail-closed** pending owner legal/product approval. Phase 11 must run reviewer-authorized, sandbox-only acceptance that proves: unaffiliated provider denial, unapproved/unavailable vehicle denial, assigned-vehicle mismatch denial, correct fleet visibility, claim race behavior, location integrity, patient-facing visibility boundaries, audit events, and administrative oversight.
