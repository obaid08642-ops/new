# Phase 0B semantic evidence — doctor-profile-extended.schema.ts

**Archive member:** `src/modules/care/schemas/doctor-profile-extended.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–38; full 38-line member covered.

Lines 2–4 define DoctorProfileExtendedDocument. Lines 6–7 define a timestamped DoctorProfileExtended schema. Lines 8–9 require a unique indexed doctor_id User ObjectId. Lines 11–15 store optional indexed parent_provider_account_id and affiliated_hospital_id User references. Lines 17–25 require clinic, online and home prices defaulting to zero. Lines 26–27 require max_home_visit_radius_km defaulting to 10. Lines 29–33 store accepted_insurance_networks and clinic_gallery_images string arrays. Lines 35–36 store a default-empty arbitrary weekly_schedule_template object. Line 38 creates the schema.

**Audit judgment:** One extended profile per doctor and indexed institutional references are useful. However provider/hospital references are only User refs with no role/type/tenant relationship validation. Prices have no currency, precision, finite/nonnegative/max bounds or effective version, and zero defaults can represent a free service indistinguishably from missing configuration. Radius has no numeric bounds/units validation. Insurance network and gallery arrays have no uniqueness, allowlist, URL/object provenance or size limits. Weekly schedule is arbitrary JSON with no timezone, interval/overlap, holiday/exception, version/CAS or booking lock semantics. No verification/licensing/active status, approval actor, idempotency, audit history or stale-profile protection is present.

No product code was changed and no tests were executed during this semantic read.
