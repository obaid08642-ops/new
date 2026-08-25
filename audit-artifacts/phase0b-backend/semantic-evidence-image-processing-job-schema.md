# Phase 0B semantic evidence — ImageProcessingJob schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/image-processing-job.schema.ts:1–18`

`ImageProcessingJob` is a timestamped `image_processing_jobs` document with required indexed owner ID, owner type enum (`doctor|nurse`), required base64 image data, MIME string, original filename, status enum (`pending|processing|completed|failed`) defaulting to pending and indexed, attempt count defaulting to zero, optional error and processed timestamp (`4–15`). The schema exports a document type and factory (`17–18`).

The owner type and status enums provide basic intent, and status/owner indexes support simple lookup (`6–12`). The schema stores raw base64 image content directly, with no visible byte/decoded-size limit, image-dimension/pixel limit, magic-byte/content validation, malware scanning, compression policy, encryption, private-object reference, retention or deletion control (`8–10`). MIME and original name are plain strings without allowlist, normalization or filename path-traversal policy (`9–10`).

Owner ID/type do not visibly establish doctor/nurse account, facility, patient/document ownership or authorization. Attempts and status have no max/retry/backoff/dead-letter/lease/heartbeat/worker ownership or optimistic concurrency semantics; `error` has no length/redaction/PII policy and `processedAt` has no duration/source/clock contract (`6–15`). No idempotency/job correlation key, queue metadata, audit trail or output reference is visible. No code was changed and no build/test/application operation was performed during this read.
