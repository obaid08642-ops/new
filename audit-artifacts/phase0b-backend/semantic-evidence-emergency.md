# Phase 0B semantic evidence — Emergency and Ambulance Fleet

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full or via verified baseline overview:**
- `src/modules/emergency/emergency.service.ts:2–315`
- `src/modules/emergency/emergency.controller.ts:2–83`
- `src/modules/emergency/ambulance-fleet.controller.ts:2–142`
- `src/modules/emergency/emergency.module.ts:2–19`

`EmergencyController` is JWT guarded. Patients can trigger SOS, view/cancel own active SOS, poll tracking, and drivers can view missions, claim an SOS and post GPS (`emergency.controller.ts:7–50`). Admin routes are role-decorated but deliberately return `ServiceUnavailableException` pending approved contracts for active/detail/manual assignment/auto-dispatch/resolve (`53–81`). `EmergencyService.trigger` persists patient id, name, phone, submitted location, symptoms and severity, transitions to location/admin-notified, fires events and launches auto-dispatch fire-and-forget (`emergency.service.ts:129–148`). Patient views project away internal provider/hospital IDs but retain symptoms, severity, location, unit label, paramedic name and timestamps (`39–55`).

Auto-dispatch loads all approved/available vehicles, scores ICU/ALS/type, GPS ETA, city, provider rating, hospital bonus and active workload, then conditionally updates an unassigned/open emergency and emits assignment (`63–127`). The score loop performs per-vehicle profile and count queries. Driver claim verifies an owned approved available vehicle and conditionally assigns the request (`238–250`). However, update results are tested for truthiness rather than a reliable matched/modified count contract. `transition`, `assign`, `resolve` and cancel paths use read/modify/save or findOneAndUpdate with differing state/history guarantees (`150–183,194–209`). `active` returns broad records with only `_id/__v` omitted (`185–190`). Tracking computes ETA from stored unit GPS and a fixed 40 km/h assumption, returns step labels and real location (`264–298`). Unit GPS validates only finite numeric values and vehicle/provider ownership; coordinate ranges are not enforced (`301–314`).

The ambulance fleet service supports provider-scoped list/create/update/delete and admin list/review. Provider roles are ambulance or hospital; admin roles are ADMIN/SUPER_ADMIN (`ambulance-fleet.controller.ts:11–18,84–142`). Fleet create accepts equipment/documents and defaults vehicle type; duplicate plate checking is application-level and excludes rejected vehicles (`24–42`). Update allows direct mutation of vehicle metadata, availability, documents and last_location and sends approved vehicles back to pending, but lacks visible field-level validation, GPS bounds, optimistic versioning or audit (`45–58`). Admin review changes pending to approved/rejected with reviewer metadata and raw notes (`66–81`). The module registers request/vehicle schemas and all three controllers/services (`emergency.module.ts:8–19`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: sensitive SOS PII persistence/return, fire-and-forget dispatch truthfulness, dispatch query/race/score governance, inconsistent state-history atomicity, weak GPS validation, fleet document/availability controls, raw admin records/notes and the intentionally blocked admin contract surface.
