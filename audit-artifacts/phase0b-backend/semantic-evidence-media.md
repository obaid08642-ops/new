# Phase 0B semantic evidence — Media

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/media/media.service.ts:2–98`
- `src/modules/media/media.controller.ts:2–173`
- `src/modules/media/media.module.ts:1–13`
- `src/modules/media/media.schema.ts:1–23`

`media.service.ts:13–37` derives S3/R2 configuration and fails closed when absent. `:39–57` uploads buffers using UUID keys but derives extension from client originalName and trusts supplied mimeType; no content sniffing/virus scan is visible. `:59–80` generates presigned download/upload URLs, bounds only URL expiry for presigned upload, and does not visibly verify asset ownership or upload completion. `:84–97` deletes arbitrary keys supplied by controller.

`media.controller.ts:10–51` uses JwtAuthGuard, limits buffer upload to 15 MB and checks extension regex, then writes MediaAsset after upload with compensating delete on database failure. MIME, filename, purpose and thread_id are client-controlled within a weak extension filter; no idempotency or post-upload verification is visible. `:53–71` creates a MediaAsset before the client completes the presigned upload and returns upload URL; abandoned/orphan assets are possible. `:73–100` protects signed URL by owner or chat participant. `:103–155` authorizes chat media through ChatThread/FamilyGroup/Appointment and fail-closes unknown errors, but relationship checks are query-based and appointment state logic is embedded. `:158–173` restricts deletion to admin/super_admin but accepts an arbitrary storage key and returns success after storage delete without verifying MediaAsset ownership/record cleanup.

`media.schema.ts:5–23` allowlists four purposes and indexes owner/thread/purpose, but stores original name, MIME and size without schema bounds/content hash/scan status/retention/deletion state. `media.module.ts:7–13` registers the asset model and service/controller only.

## Findings candidates

The read supports: client-controlled extension/MIME and lack of content validation, presigned orphan assets, missing upload completion/scan state, arbitrary admin key deletion and metadata cleanup gaps, missing idempotency/retention/hash, and embedded chat relationship logic.

No product code was changed and no tests/builds were executed during this semantic read.
