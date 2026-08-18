# Phase 5 Backend/Database — storage and media privacy gaps

## Confirmed controls

Storage records owner, visibility, MIME, size and checksum metadata; private read/signed-url methods enforce owner/admin access; signed R2/Cloudinary delivery is intended to expire after five minutes. These are appropriate foundations.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|
| **P0** | Generic upload accepts caller-selected `public_read` visibility | Both storage upload routes forward arbitrary body visibility. Any authenticated user/provider can publish an uploaded object, regardless of document purpose or medical/KYC classification. | Make visibility server-derived by purpose-specific upload endpoint; deny public delivery for health, prescription, KYC, contract, report, location or support attachment data and require review before public catalog/profile assets. |
| **P0** | Private Cloudinary object can fall back to raw external URL if signing is unavailable | `signedUrl` returns `external_url` with no expiry when Cloudinary secret is unavailable, even if object visibility is private. | Fail closed for private delivery when signing configuration fails; alert/monitor configuration errors and never expose a raw fallback URL. |
| **P1** | MIME/type validation trusts caller declaration and virus scanning is only a comment/hook | Base64 data is accepted based on supplied MIME/size; no content sniffing, malware scan, image/pdf parsing, EXIF stripping, DLP or quarantine/review flow is shown. | Add server-side content detection, malware/DLP scanning, metadata sanitization, quarantine and purpose-specific validated file schemas before availability. |
| **P1** | S3/R2 failure silently stores file bytes inline in database | Adapter failure falls back to `Base64Adapter`, contrary to intended object-storage separation and potentially enlarging DB/backups/logical exposure for sensitive files. | Fail safely or use a governed resilient object-storage queue; never persist sensitive file bytes in primary database fallback without explicit encryption, retention, capacity and recovery policy. |
| **P1** | Guest suggestion uploads share a generic `guest` owner identity | Public route stores every unauthenticated upload with owner `guest`, making ownership, abuse tracing, deletion and object-level privacy lifecycle ambiguous. | Use rate-limited temporary anonymous upload identities, scoped one-time references, expiry/quarantine and moderation; do not expose generic-owner objects to normal read paths. |
| **P1** | Purpose/retention/consent is absent from generic media object metadata | Records have owner/kind/visibility but not data category, legal basis, consent/version, retention, document relation, viewer audit or deletion hold. | Add purpose-bound object metadata and policy enforcement for medical/KYC/contract/support/profile/catalog data; audit every sensitive view/share/delete. |

## Decision

Media storage is **P0 FIX/BLOCKED** for sensitive data. Existing owner checks are insufficient while uploaders choose visibility and private delivery can fall back to an unsigned URL.
