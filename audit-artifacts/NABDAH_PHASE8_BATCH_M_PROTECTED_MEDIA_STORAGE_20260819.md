# Phase 8 — Batch M: protected media and storage

## Purpose

The Phase 5 privacy audit found that the storage module accepted client-selected visibility, could fall back from an R2 failure to inline Base64 storage, returned direct private origins in some read/signing paths, and could return an unsigned Cloudinary URL when signing material was absent. These paths could leave sensitive clinical, KYC, insurance or report media available beyond an authorization decision.

## Source change

| Surface | Implemented control |
|---|---|
| Authenticated upload visibility | Generic authenticated upload endpoints ignore client `visibility` and `owner_kind` escalation inputs; every newly created object is private. Public publication is now intentionally outside this client upload contract and must use a reviewed server-side workflow. |
| R2/base64 behavior | Private upload requires configured R2-compatible storage. Missing/failed object storage produces a service-unavailable error; it no longer falls back to inline Base64 and silently retains sensitive bytes in MongoDB. |
| Cloudinary private media | Cloudinary uploads use `authenticated` delivery, persist private visibility, and return the authenticated API route rather than a direct source/thumbnail URL. |
| Read response | An authorized private read no longer returns a private object’s direct external origin/CDN URL. |
| Signed URL | Cloudinary signing-material absence fails closed. R2 signing failure yields only the authenticated API stream path, never a direct origin URL. Direct CDN/origin URL remains confined to an already-public object. |

## Verification

| Gate | Result |
|---|---|
| Focused storage regression | **PASS** — `storage.module.spec.ts`: 1 suite, 3 tests. It verifies foreign-user denial before read, stripping private direct origin in an authorized read, and API-only fallback for unpresignable private object. |
| Combined Backend Phase 8 regressions | **PASS** — 11 suites, 104 tests. |
| Backend production build | **PASS** — `npm run build` (`nest build`). |
| Archive integrity | **PASS** — rebuilt Backend archive validates with `unzip -tq`; dependency/build outputs are excluded. |
| Backend archive SHA-256 | `87ce4103035aaf7da48cd9b4b554b7b57247f7dcd2cac2948a912e2347e13445` |
| Branch upload | **PASS** — source commit `4e66354` (`fix: fail closed private media storage`) is on `manus/on-live-reconciliation`. |

## Deployment and acceptance constraints

This is a deliberately fail-closed change: deployment requires a working private R2-compatible storage configuration and Cloudinary signing material where Cloudinary private media is enabled. Existing public objects/legacy external URLs require a separate inventory and migration/revocation plan before claiming retroactive privacy. Phase 9/11 must run owner/foreign/admin/expired-link tests with sandbox assets and verify no direct private origin, inline Base64 or unsigned Cloudinary URL is emitted.
