# Insurance Logo Release Candidates

This directory contains **official-source, unmodified brand assets** converted to small transparent lossless WebP files for the Nabdah insurance catalogue. Each asset is accompanied by its original official-company URL and SHA-256 in `manifest.json`.

## Release Safety

The initial 17 verified assets were reported by the release owner as uploaded to the approved production bucket and served through `https://cdn.nabd.plus/catalog/insurance-logos/`, with SHA-256 values matching the database. This repository does **not** itself perform uploads.

The two later candidates, `gulf_general.webp` and `saudi_enaya.webp`, are **not uploaded or linked by this candidate**. A reviewer/DevOps owner must first upload a selected asset to the approved public catalogue-media bucket, verify the uploaded byte hash, then apply the matching `logo_url`, `logo_source_url`, `logo_sha256`, and `logo_verified_at` fields through the admin-reviewed catalogue update path. `saudi_enaya.webp` must additionally remain non-public while its legal identity/supersession status is pending review.

The catalogue policy is non-destructive. Historical, suspended, renamed, merged, or retired companies remain stored in `insurance_companies` and can be reactivated after review. They are not removed merely because they are unsuitable for the current public selection flow.

## Asset Contract

| Property | Requirement |
|---|---|
| Format | WebP, lossless, transparent when the official source supports alpha |
| Size | Maximum bounding-box edge of 256 pixels |
| Provenance | Official insurer website only; no generated marks or third-party logo directories |
| Integrity | SHA-256 in `manifest.json` must match the uploaded asset |
| Publication | `logo_url` is assigned only after approved storage upload and reviewer confirmation |

## Current Candidate Scope

The current manifest records 19 official-source candidates: 17 production-published assets reported as CDN-verified, one new active-entity candidate for Gulf General, and one official-source candidate for inactive transition record Saudi Enaya. Twelve records remain `pending_official_brand_source` or require legal-name/rebrand review. This deliberate incompleteness is fail-closed and must not be replaced with generated or unofficial logos.

The files are release artifacts, not a database migration. Running any existing seed script must not overwrite `logo_url`, `is_active`, `catalog_status`, or historical/supersession metadata.
