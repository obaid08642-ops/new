# Phase 0B semantic evidence — AmbulanceVehicle schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/ambulance-vehicle.schema.ts:1–38`

The schema models a provider fleet vehicle and documents a dual ownership model (ambulance company or hospital/clinic), with an intended admin review gate before availability (`5–11`). It stores generated unique id, required indexed provider_account_id and plate_number, optional model/year, equipment array, paramedic_count, has_icu, enum vehicle_type BLS/ALS/ICU, embedded last_location lat/lng/updated_at, base_city, document URL array, enum status pending/approved/rejected/suspended, admin notes/reviewer/time and is_available (`11–37`).

The model has only basic enum/default/index constraints. Plate number, model, year, equipment, paramedic_count and base_city lack normalization, format, range, capability and jurisdiction validation (`14–20,26`). `has_icu` can contradict vehicle_type and equipment/paramedic_count; no safety invariant ensures ICU/ALS capability is backed by approved equipment and qualified crew (`18–22`).

`last_location` stores raw lat/lng without geographic bounds, precision/rounding, freshness/accuracy/source, timezone or geospatial index; no privacy/retention/access policy or stale-location behavior is represented (`23–25`). It is described as crew-app supplied and used for nearest/ETA scoring, but there is no authenticated device/crew provenance, spoofing detection, consent or audit trail (`23–25`).

Documents are URL strings without document type, ownership, expiry, verification, storage ACL/signed access, MIME/content/size/malware or retention metadata (`27–28`). Status/review fields have no transition authorization, reviewer role, rejection/suspension reason, approval evidence or CAS/append-only audit (`29–33`). `is_available` is independent from status and has no invariant requiring approved status, valid documents, current location, maintenance/crew readiness or active dispatch exclusion (`29–34`).

Provider account ownership is a plain string with no tenant/facility/provider-type referential constraint, unique plate scoped globally/provider, de-registration or transfer semantics (`13–15`). No fleet assignment, maintenance/inspection/insurance expiry, crew/shift, dispatch reservation, trip lifecycle, ETA provenance, incident or vehicle-use audit is represented (`14–34`). No idempotency, atomic availability/dispatch locking, concurrency/CAS, soft-delete/retention, notification/review delivery or live runtime evidence is established by this source read. No code was changed and no build/test/application operation was performed during this read.
