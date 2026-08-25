# Phase 0B semantic evidence — Storage private-media spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/storage/storage.module.spec.ts:1–31`

This Jest unit spec constructs `StorageService` with a mocked metadata model and adapter (`4–12`). It verifies that a foreign patient is rejected before the adapter reads the private object (`14–18`), that an authenticated private read does not expose the direct origin URL while preserving MIME type (`20–25`), and that when presigning is unavailable the service returns an authenticated API-stream URL with null expiry (`27–30`).

These cases provide focused source regression evidence for one ownership boundary and direct-origin redaction. They do not prove controller/session guards, uniform 404/403 behavior, owner roles beyond one patient, tenant/facility scope, deleted-object behavior, upload authorization, filename/path traversal, MIME/content sniffing, size limits, malware scanning, presigned URL expiry/revocation, range/cache headers, download audit, retention/purge, object-store ACLs, signed URL leakage or live S3/R2 behavior (`8–30`).

The test uses `any` fixtures and a mocked adapter/model; the fallback assertion expects `expires_in:null`, so time-bound authorization is not demonstrated for the API stream itself (`9–11,27–30`). No test covers adapter failure, metadata/object mismatch, bucket misconfiguration, race on deletion, duplicate upload/idempotency or private URL response headers. No test was run and no product code was changed during this semantic read.
