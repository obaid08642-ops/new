# Phase 0B semantic evidence — profile-image-metadata.schema.ts

**Archive member:** `src/schemas/profile-image-metadata.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–21; full 21-line member covered.

Lines 2–5 import Document and define a timestamped `profile_images_metadata` collection. Line 6 requires indexed owner_id, commented as user_id or provider_profile_id. Line 7 requires owner_type enum doctor/nurse. Lines 8–11 require originalImageUrl and optionally store processed/medium/thumbnail URLs. Line 12 defaults transparent-background flag false. Lines 13–14 define required processingStatus enum pending/processing/completed/failed with pending default. Line 15 requires processingProvider with disabled default. Lines 16–17 store optional lastProcessedAt and error. Lines 19–20 define the document type/create the schema, and line 21 indexes owner_id/processingStatus.

**Audit judgment:** Owner identity/type, processing lifecycle and per-owner/status index are useful primitives. However owner_id has no reference/format/tenant binding and no uniqueness/current-image/version semantics; owner_type supports only doctor/nurse and may not match all profile actors. URL fields have no HTTPS/domain/object-key validation, hash/content-type/size provenance or deletion/cleanup linkage. Processing status is not paired with attempt count, lease, retry/dead-letter, job/request/idempotency key, processor result version or immutable audit record. `processingProvider` default disabled and free-form provider data need explicit allowlist; `error` may expose internals. No retention/expiry or PII projection policy is visible.

No product code was changed and no tests were executed during this semantic read.
