# Phase 0B semantic evidence — provider-image-processor.service.ts

**Archive member:** `src/modules/provider/services/provider-image-processor.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–160 and 161–316; full 316-line member covered.

Lines 2–25 inject metadata/job/profile/audit repositories, StorageService and Sharp. Lines 27–78 implement `enqueueJob`: allow JPEG/JPG/PNG/WebP MIME strings, decode base64 and cap decoded size at 5 MB, fail existing pending/processing jobs for the owner, upsert metadata, create a queue job containing raw base64/mime/original name and return pending status.

Lines 80–97 return image metadata/status by arbitrary owner ID. Lines 99–137 run every 10 seconds, load up to three pending jobs, mark processing and increment attempts, update metadata, process the image, or mark failure and write an audit record. There is no visible distributed lock/claim predicate, so multiple workers may process the same jobs.

Lines 138–160 decode the image with Sharp, require dimensions, and enforce 100–4000 pixel dimensions; alpha detection is recorded. Lines 162–182 produce original/large/medium/thumbnail WebP variants. Lines 184–238 upload all four variants to Cloudinary with deterministic public-read custom keys and store returned IDs as URLs/identifiers.

Lines 240–277 update metadata and provider profile image ID, mark job completed, audit success, and log. These DB/storage operations are sequential without transaction/outbox/compensation; partial upload or metadata/profile failure can leave orphaned or mismatched variants. Public-read visibility is used for provider images; private/signed access is not used here.

Lines 279–289 reprocess the latest owner job and reset status. Lines 291–300 replace an image by enqueueing a job with hard-coded `owner_type: 'doctor'` and filename `replaced_profile.png`. Lines 302–311 retry all failed jobs for owner. Lines 313–315 return image audit logs by arbitrary owner ID.

**Security/ownership:** `getStatus`, `reprocessImage`, `replaceImage`, `retryFailedJobs` and `getImageLogs` accept arbitrary owner IDs without caller context or visible admin/provider authorization. `enqueueJob` also trusts owner ID/type from callers. Ownership is not enforced by this service. Raw base64 is stored in job records until processing and public-read assets are generated.

**Content/security validation:** MIME is client-supplied and only string-allowlisted; file magic/content, decompression-bomb/resource limits, EXIF stripping, malware scanning and base64 validity are not visible. Sharp metadata/dimension checks happen after queue persistence. Original image is uploaded publicly, potentially exposing source content/metadata. No image deletion/retention policy is visible.

**Reliability/idempotency:** superseding jobs uses updateMany then create, without atomic claim/idempotency key. Cron processing reads pending jobs then saves processing without conditional claim. Attempts increment but no max retry/backoff/dead-letter policy is visible. Failure audit itself is not isolated. Reprocess/retry can create duplicate work.

**Truthfulness/identity:** processing provider is hard-coded `local-webp-processor`; `replaceImage` hard-codes doctor owner type even for nurses. Status metadata does not prove publication success or CDN availability. `originalImageUrl`/processed fields store storage IDs returned by StorageService despite URL naming.

**Privacy/audit:** audit records duplicate owner/provider IDs and include processing errors; log retention/redaction is not visible. `getImageLogs` returns raw logs without pagination/projection. Public custom keys are predictable by owner ID.

**Price/payment/insurance source:** none visible.

**Test implications:** require owner/stranger/admin/unauth tests, true MIME/content validation, EXIF/malware/decompression safety, private/signed access and predictable-key controls, distributed job claim/idempotency/retry/dead-letter, transaction/compensation, deletion/retention, nurse owner type, storage ID/URL semantics, pagination/redaction and CDN publication verification. No tests executed during this semantic read.
