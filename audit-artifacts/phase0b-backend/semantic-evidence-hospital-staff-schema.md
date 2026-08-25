# Phase 0B semantic evidence — HospitalStaff schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/hospital/schemas/hospital-staff.schema.ts:1–27`

The schema defines a timestamped `HospitalStaff` document and its Mongoose document type (`4,6–7,27`). It stores required ObjectId references to `User` as `user_id` and `hospital_id`, optional indexed references to `HospitalBranch` and `HospitalDepartment`, a required enumerated role, and an `is_active` flag defaulting to true (`8–24`). The schema therefore expresses basic field types, requiredness, references and role vocabulary.

No compound uniqueness is declared for `(user_id, hospital_id, branch_id, department_id)` or any equivalent membership key; no validator proves that hospital/branch/department references belong to one another; no timestamps/actor/version/audit fields beyond automatic create/update timestamps are explicit; and there is no soft-delete/deactivation reason, approval state, credential expiry, employment status or revocation metadata. The default-active behavior can be unsafe if records are created before approval unless service-layer creation is strictly gated (`23–24`).

The `role` enum includes receptionist, branch_admin, finance, doctor and lab_tech (`20–21`), but the schema does not encode capability scopes, provider type, least privilege, staff verification or role transition audit. Authorization and facility boundary must therefore be proven in service/guard/controller code; a schema reference is not an ownership check. No build/test/database operation was performed and no product code was changed during this semantic read.
