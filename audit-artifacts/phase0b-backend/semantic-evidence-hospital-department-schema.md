# Phase 0B semantic evidence — HospitalDepartment schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/hospital/schemas/hospital-department.schema.ts:1–30`

The schema defines a timestamped `HospitalDepartment` document with required indexed `hospital_id` User reference and required indexed `branch_id` HospitalBranch reference, required Arabic/English names and `specialty_code`, numeric `consultation_fee` defaulting to zero, and `is_active` defaulting true (`6–27`). It creates the Mongoose schema from the class (`30`).

The member does not enforce that `branch_id` belongs to `hospital_id`, that the referenced hospital is a facility, or that the branch is active/authorized. It does not validate names, specialty-code vocabulary, fee finiteness/non-negativity/precision, currency, tax, insurance/cash semantics or server pricing provenance (`14–24`). A default zero fee may be truthful for a free department but is also ambiguous if fee provisioning is incomplete (`23–24`).

No compound uniqueness is declared for hospital/branch/specialty, no version or audit actor exists, and `is_active` defaults true without approval/publication/revocation metadata (`23–27`). The schema contains no capability or provider-type mapping, so department visibility and booking eligibility must be proven in service/controller/policy layers. No code was changed and no build/test/database operation was performed during this semantic read.
