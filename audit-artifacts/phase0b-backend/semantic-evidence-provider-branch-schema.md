# Phase 0B semantic evidence — provider-branch.schema.ts

**Archive member:** `src/schemas/provider-branch.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–33; full 33-line member covered.

Lines 2–5 import Document/uuid and define ProviderBranchDocument. Lines 7–8 define a timestamped `provider_branches` collection. Lines 9–10 generate a string `_id`. Lines 12–13 require indexed parent_hospital_id referencing ProviderProfile. Lines 15–19 require Arabic and English branch names. Lines 21–25 require city and district. Lines 27–28 require a location object with lat/lng numeric fields and no subdocument id. Lines 30–31 store an optional array of User-referenced doctors_roster, defaulting to empty. Line 33 creates the schema.

**Audit judgment:** Explicit parent reference, bilingual labels, required location and doctor references are useful structural primitives. However parent_hospital_id is only a reference/index and there is no tenant/account binding or provider-type authorization; `_id` is generated but no business uniqueness exists for parent/name/address. Location has no latitude/longitude bounds, coordinate reference system or geocoding provenance. Names/city/district have no length/normalization/locale bounds. doctors_roster has no uniqueness, active-provider/role validation, branch assignment history or roster-change actor/audit. There is no active/closed state, deletion policy, version/CAS or booking visibility lifecycle, so stale branches/doctors may remain operationally selectable.

No product code was changed and no tests were executed during this semantic read.
