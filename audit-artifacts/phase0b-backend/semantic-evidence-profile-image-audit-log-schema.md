# Phase 0B semantic evidence — profile-image-audit-log.schema.ts

**Archive member:** `src/schemas/profile-image-audit-log.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–16; full 16-line member covered.

Lines 2–5 import Mongoose Document and define a timestamped `profile_image_audit_logs` collection. Lines 6–7 require indexed `user_id` and `provider_id`, both commented as owner_id. Line 8 records processing_date with Date.now default. Line 9 requires selected_provider, line 10 requires api_key_index_used defaulting to -1, and line 11 restricts processing_result to success/failed. Line 12 optionally stores failure_reason. Lines 14–15 define the document type/create the schema, and line 16 indexes user_id/createdAt.

**Audit judgment:** Required user_id/provider_id and processing result are positive attribution fields, but requiring both owner identities may be semantically invalid for flows where only one owner exists and can create ambiguous or fabricated ownership. The schema has no action/version/source object ID, input/output image identifiers or hashes, actor/session/request/idempotency key, correlation/job ID, retention/expiry, redaction/encryption policy or provider configuration snapshot. `selected_provider` and `api_key_index_used` can expose operational provider/key-routing details; no explicit secret-safe projection is defined. The log has no immutable write restriction or unique job claim.

No product code was changed and no tests were executed during this semantic read.
