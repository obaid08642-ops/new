# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AE_AMBULANCE_EMERGENCY_RECORD_INTEGRITY_20260819.md`
- **Member SHA-256:** `d7daa62769d84995313ca683ab8f033eae5ae3e75734af823d5b421b85c133a1`
- **Line count:** 35
- **Read range:** `1-35`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The prior ambulance workflow allowed an emergency record to be claimed and location-tracked without a verified, explicit vehicle binding. The claim code wrote the authenticated provider identifier into `assigned_ambulance_id`, which conflat`
- `15: | Controller boundary | Claim and tracking controllers forward only the submitted `vehicle_id` to the service boundary; authorization remains server-owned. |`
- `16: | Ambulance dashboard | The provider selects an approved vehicle before accepting a pool mission; the selected or assigned vehicle ID is submitted for claim and tracking. A provider without an approved vehicle sees an explicit unavailable s`
- `17: | Shared provider SOS/GPS | `SosDispatchScreen` and `GpsRouterScreen` are explicitly **fail-closed** outside the dedicated ambulance workflow. They cannot trigger, list, claim, route, or broadcast emergency location for a general provider. `
- `31: | Branch upload | **PASS** — archive commit `ad4fcae` (`fix: bind ambulance emergency records to verified vehicles`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: The prior ambulance workflow allowed an emergency record to be claimed and location-tracked without a verified, explicit vehicle binding. The claim code wrote the authenticated provider identifier into `assigned_ambulance_id`, which conflat`
- `14: | Location tracking | `updateUnitLocation()` requires `vehicle_id`, verifies the same approved fleet ownership and requires the vehicle to match the incident’s `assigned_ambulance_id` before storing location. |`
- `15: | Controller boundary | Claim and tracking controllers forward only the submitted `vehicle_id` to the service boundary; authorization remains server-owned. |`
- `35: No live emergency, vehicle, location, dispatch, patient, or provider record was created or altered. This is a source-level containment and regression result, not a declaration that emergency dispatch is production-authorized. SOS, QR, conse`
### state_transitions
- `11: | Backend claim | `EmergencyService.claim()` now requires `vehicle_id`; it looks up an **approved, available vehicle owned by the authenticated provider** and fails closed with `400` when absent and `403` when the asset cannot be verified. `
- `12: | Emergency record | A successful claim stores the verified vehicle in `assigned_ambulance_id`, retains the authenticated provider separately in `assigned_provider_id`, and uses the vehicle’s server-backed label. The caller ID is never trea`
- `13: | Mission list | `driverMissions()` exposes only the caller’s approved available fleet for selection, alongside missions assigned to that provider. |`
- `14: | Location tracking | `updateUnitLocation()` requires `vehicle_id`, verifies the same approved fleet ownership and requires the vehicle to match the incident’s `assigned_ambulance_id` before storing location. |`
- `16: | Ambulance dashboard | The provider selects an approved vehicle before accepting a pool mission; the selected or assigned vehicle ID is submitted for claim and tracking. A provider without an approved vehicle sees an explicit unavailable s`
- `23: | Focused emergency vehicle-integrity spec | **PASS** — 3/3 assertions: missing `vehicle_id` rejects, foreign/unapproved vehicle rejects, and valid claims bind the verified vehicle plus authenticated provider. |`
- `28: | Provider production web export | **PASS** — Expo web bundle completed. |`
- `35: No live emergency, vehicle, location, dispatch, patient, or provider record was created or altered. This is a source-level containment and regression result, not a declaration that emergency dispatch is production-authorized. SOS, QR, conse`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `35: No live emergency, vehicle, location, dispatch, patient, or provider record was created or altered. This is a source-level containment and regression result, not a declaration that emergency dispatch is production-authorized. SOS, QR, conse`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
