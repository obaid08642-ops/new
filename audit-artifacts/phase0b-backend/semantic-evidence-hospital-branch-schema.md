# Phase 0B semantic evidence — HospitalBranch schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/hospital/schemas/hospital-branch.schema.ts:1–33`

The schema defines a timestamped `HospitalBranch` document with a required indexed ObjectId `hospital_id` reference to `User`, required Arabic/English names, city, district, a required nested latitude/longitude object, required contact number, and `is_active` defaulting true (`6–30`). It creates the Mongoose schema directly from the class (`33`).

The member does not validate coordinate numeric ranges, finite values, geographic bounds, address normalization, city/district vocabulary, phone format/country, name length/content or language completeness (`11–27`). It does not declare uniqueness for a hospital's branch name/address/coordinates, branch code, soft-delete/reason, approval/publishing status, verification actor, facility type or operational hours. `is_active` is enabled by default with no schema-level approval lifecycle (`29–30`).

`hospital_id` is typed as a User reference, so correct facility identity and hospital-vs-user type semantics must be proven in service/controller code; the schema alone does not bind a branch to a hospital entity or protect cross-facility access (`8–9`). No public projection or field minimization is encoded, and coordinates/contact data can be exposed if a generic repository/serializer is used. No code was changed and no build/test/database operation was performed during this read.
