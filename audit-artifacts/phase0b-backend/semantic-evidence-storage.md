# Phase 0B semantic evidence — Storage

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/storage/storage.module.ts:2–410`

The module defines `StorageObject` with backend, MIME, original name, size, checksum, inline base64/external URL/key, owner, visibility, expiry, Cloudinary metadata and deleted flag (`storage.module.ts:14–36`). It provides Base64 and S3/R2 adapters, with adapter selection at service construction: S3/R2 if fully configured, otherwise inline Base64 storage (`44–71,112–125`). Upload limits allow JPEG/JPG/PNG/WebP/PDF and estimate size from base64 length, with an 8 MB code constant despite the error text claiming 8MB while the comment says 25 MB (`109–110,184–187`).

`StorageService.upload` routes Cloudinary or requires configured private R2 for normal uploads, computes checksum over the base64 string, writes object metadata and returns an API path (`180–216`). `read` and `signedUrl` enforce owner ID unless public_read or role exactly `'admin'`; they return object metadata/data and can expose full original filename/MIME/size (`219–275`). Signed URLs are five-minute Cloudinary/R2 URLs or API fallback. Cloudinary uploads are configured as authenticated images, use a sanitized custom key at controller level, store full metadata and overwrite when customKey exists (`277–343`).

`handleDeleteByUrl` is event-driven, deletes Cloudinary/R2 objects based on URL parsing and marks database records deleted, but swallows failures into warnings (`127–178`). The controller has normal upload/read/signed-url routes with no visible class-level `JwtAuthGuard` decorator in the file, guest public suggestion-image upload, and a separate Cloudinary upload route (`346–402`). The guest suggestion route marks owner as guest and calls normal R2 upload, while normal `upload` trusts `user.id` without a visible guard. `uploadCloudinary` similarly trusts `user.id` and accepts body fields. No visible magic-byte/content scanning, virus scan implementation, filename normalization, quota, rate limit, idempotency, retention job or complete owner-kind authorization exists. The module registers and exports the storage service/schema (`404–410`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: possible unauthenticated normal/cloudinary upload, guest R2 storage policy mismatch, base64 PII/storage fallback, MIME spoofing, size-limit ambiguity, signed URL/public object governance gaps, event deletion failure, custom-key overwrite, and absent quota/scan/retention/idempotency controls.
