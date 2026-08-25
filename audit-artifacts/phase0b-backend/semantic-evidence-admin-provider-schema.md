# Phase 0B semantic evidence — Admin provider schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-web-core/schemas/provider.schema.ts:1–33`

`Provider` is a timestamped Mongoose schema with required name/type, a limited type enum (`doctor`, `pharmacy`, `home_care`), boolean `verified` defaulting false, optional `nationalId`, `commercialCr`, `mohLicense`, `medicalLicense`, and `isActive` defaulting true (`provider.schema.ts:6–30`). It stores identity and licensing identifiers as plain schema fields without visible encryption, hashing/tokenization, field-level select restrictions, uniqueness/index declarations, format validation, expiry/revocation metadata or audit provenance. Verification and activity are independent booleans with no approval actor/time/reason or state machine in the schema. The type enum may not cover other provider domains present elsewhere in the backend. No product code was changed and no tests/builds were executed during this semantic read.
