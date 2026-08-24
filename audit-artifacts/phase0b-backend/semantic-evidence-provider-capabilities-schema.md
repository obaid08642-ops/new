# Phase 0B semantic evidence — capabilities.schema.ts

**Archive member:** `src/modules/provider/schemas/capabilities.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–197; full 197-line member covered.

Lines 6–36 define PharmacyInventoryItem in `provider_capabilities_pharmacy`: provider account, SKU/name/barcode/category, optional medicine attributes/substitutes, minimum stock alert, restock time, stock default 0, price required default 0, currency SAR, available true, expiry and notes. Compound provider/SKU uniqueness and provider/available index exist. No nonnegative/precision/currency validation, expiry enforcement, stock reservation/CAS, server price provenance, or sensitive-note policy is visible.

Lines 37–53 define LabTestCatalogItem in `provider_capabilities_lab`: provider account, code/name/sample type, turnaround default 24 hours, home collection false, price default 0, SAR, available true, with provider/code uniqueness. No numeric bounds, code normalization, active/published lifecycle, insurance/price provenance or versioning is visible.

Lines 54–68 define RadiologyServiceCatalogItem: provider account, scan type/body part, bilingual names, contrast flag, price default 0, SAR, availability, with provider/scan/body uniqueness. No modality/body validation, capability evidence, active/published state, currency/price invariants or booking snapshot policy is visible.

Lines 70–82 define DoctorSessionType: provider account, consultation type, specialty, duration default 30 minutes, price default 0, SAR, available true, with provider/type/specialty uniqueness. No allowed consultation-type enum, duration bounds, timezone/schedule linkage, insurance eligibility or immutable price snapshot is visible.

Lines 84–97 define HomeCareServiceCatalogItem: provider account, service type, required skills, minimum hours default 1, hourly price default 0, SAR, availability, with provider/service uniqueness. No service-type/skill allowlist, minimum-hour/price bounds, credential linkage or effective version is visible.

Lines 99–115 define ProviderDeliveryZone: provider account/name, shape circle/polygon, optional center, radius default 0, polygon array, base fee/free threshold defaults 0, active true, with provider/active index. No lat/lng bounds, polygon validity, radius positivity, overlap resolution, geospatial index, currency or effective-date policy is visible.

Lines 117–131 define recurring ProviderScheduleSlot: provider account, day 0–6 with min/max, HH:MM start/end strings, duration default 30, capacity default 1, active true, note, with provider/day/start index. No time-format or end-after-start validation, timezone, overlap/unique compound constraint, holiday exceptions, capacity bounds or booking lock is visible.

Lines 133–166 define assignment strategy/status enums and ProviderAssignmentAttempt: request/provider IDs, attempt index, strategy default auto_best, status default pending, sent/responded times, timeout default 120, required expiry, arbitrary score and rejection reason, with request/attempt and provider/status indexes. No unique request/provider/attempt compound constraint, expiry enforcement, winner CAS, score provenance, retry policy or actor/tenant boundary is visible.

Lines 168–185 define ProviderScoreSnapshot: unique ID and unique provider_account_id, aggregate counters default 0, rates/scores default 0, response/completion averages and last calculation time. No bounds/nonnegative validation, calculation window, algorithm version, source event, atomic update, historical snapshots or audit provenance is visible.

Lines 187–197 define REQUEST_TYPE_TO_PROVIDER_TYPES mapping and `eligibleProviderTypesFor`, returning an empty array for unknown request types. This is a hard-coded routing policy: pharmacy maps to pharmacy/hospital, lab to laboratory/hospital, radiology to radiology/hospital, doctor to doctor/clinic/hospital/telemedicine, home_care to home_care/nursing/physiotherapy/hospital. No database/config/version/effective-date or licensing verification is present in this member.

**Cross-cutting findings:** Every catalog defaults price to zero and SAR; availability defaults true. The schemas establish indexes but mostly do not encode business invariants. Assignment/scoring and eligibility mappings are operationally high-impact and require service-level atomicity, provenance and configuration governance.

**Test implications:** enforce schema validation and currency/price invariants; stock reservation; catalog active/published/ownership; schedule timezone/overlap/capacity; geofence validity; assignment uniqueness/expiry/winner CAS; score bounds/provenance; eligibility licensing; and no mock/seed exposure. No tests executed during this semantic read.
