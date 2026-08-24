# Phase 0B semantic evidence — simulated-features.dto.ts

**Archive member:** `src/modules/provider/simulated-features.dto.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–141; full 141-line member covered.

Lines 3–33 define `CreateCampaignDto`. It validates title_ar/title_en as non-empty strings, original_price/discounted_price as numbers, optional ISO dates, optional image URL and arbitrary target_parameters object. No positivity, currency, discount relationship, URL protocol/host policy, title length, date ordering or target key allowlist is visible.

Lines 35–51 define `CreateReferralDto` with required string patient_id and target_type, optional notes and requested_tests array. No identifier format/ownership, target enum, notes length/redaction or test-code validation is visible.

Lines 53–77 define `UpdateCrmTagDto` with optional booleans VIP/favorite/blocked, blocked reason, custom tags and `private_notes?: any[]`. Shape validation exists but no item types, length limits, sensitive-data redaction, actor scope, or immutable audit requirement is visible. `private_notes` is especially unrestricted.

Lines 79–107 define `CreateStaffAccountDto` with required full_name, phone and password; optional email, role, department and permissions string array. The DTO only checks string/array types. No password policy, normalization, role allowlist, permission allowlist, invitation/activation workflow, or prohibition on returning/storing plaintext password is visible. This is a high-impact credential and privilege boundary.

Lines 109–117 define `HomeCareCheckinDto` with optional numeric lat/lng. No finite/range/accuracy/timestamp validation or patient/visit binding is visible.

Lines 119–131 define `HomeCareSubmitReportDto` with optional completed_tasks string array, arbitrary vitals_logged object and optional notes string. No task allowlist, vital schema/ranges/units, timestamp, visit ownership, note limits or clinical audit/versioning is visible.

Lines 133–141 define `RadiologyUploadReportDto` with required report_text and optional file_id. No report length/content controls, file ownership/type/scan binding, author/encounter binding or immutability is visible.

**Truthfulness/production:** The filename and controller pairing identify these as simulated-feature DTOs. DTO validation alone does not prevent the endpoints from being wired in production; feature/environment gating must be proven at controller/module/runtime layers. Arbitrary objects and arrays can accept mock or synthetic payloads without evidence of backend provenance.

**Test implications:** require whitelist/forbid-non-whitelisted validation, size limits, numeric/date ranges, financial invariants and currency, patient ownership, staff credential handling, role/permission policy, geofence/visit binding, clinical schema/ranges, file ownership/security scanning, redaction, audit/versioning, and production route gating. No tests executed during this semantic read.
