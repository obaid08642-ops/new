# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE5_STORAGE_MEDIA_PRIVACY_GAPS_20260819.md`
- **Member SHA-256:** `693ad910d8abf30b7e39e5f1c86f70516f01b7d57a93889c0ff4e54efff1a9f8`
- **Line count:** 20
- **Read range:** `1-20`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | **P0** | Generic upload accepts caller-selected `public_read` visibility | Both storage upload routes forward arbitrary body visibility. Any authenticated user/provider can publish an uploaded object, regardless of document purpose or med`
- `15: | **P1** | Guest suggestion uploads share a generic `guest` owner identity | Public route stores every unauthenticated upload with owner `guest`, making ownership, abuse tracing, deletion and object-level privacy lifecycle ambiguous. | Use `
- `20: Media storage is **P0 FIX/BLOCKED** for sensitive data. Existing owner checks are insufficient while uploaders choose visibility and private delivery can fall back to an unsigned URL.`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `5: Storage records owner, visibility, MIME, size and checksum metadata; private read/signed-url methods enforce owner/admin access; signed R2/Cloudinary delivery is intended to expire after five minutes. These are appropriate foundations.`
- `15: | **P1** | Guest suggestion uploads share a generic `guest` owner identity | Public route stores every unauthenticated upload with owner `guest`, making ownership, abuse tracing, deletion and object-level privacy lifecycle ambiguous. | Use `
- `16: | **P1** | Purpose/retention/consent is absent from generic media object metadata | Records have owner/kind/visibility but not data category, legal basis, consent/version, retention, document relation, viewer audit or deletion hold. | Add p`
- `20: Media storage is **P0 FIX/BLOCKED** for sensitive data. Existing owner checks are insufficient while uploaders choose visibility and private delivery can fall back to an unsigned URL.`
### state_transitions
- `3: ## Confirmed controls`
- `7: ## Confirmed defects`
- `12: | **P0** | Private Cloudinary object can fall back to raw external URL if signing is unavailable | `signedUrl` returns `external_url` with no expiry when Cloudinary secret is unavailable, even if object visibility is private. | Fail closed `
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `12: | **P0** | Private Cloudinary object can fall back to raw external URL if signing is unavailable | `signedUrl` returns `external_url` with no expiry when Cloudinary secret is unavailable, even if object visibility is private. | Fail closed `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
