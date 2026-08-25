# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AP_ADMIN_SERVICE_CATALOG_PUBLICATION_CONTAINMENT_20260819.md`
- **Member SHA-256:** `ad89daec72cf0274eb1dc05f1bc61b6623b59e06bc4796c6c36358b28fe50fdf`
- **Line count:** 30
- **Read range:** `1-30`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: | Laboratory catalogue | Create/update routes return `503` before a service record changes; retirement returns `503` before deletion. |`
- `12: | Radiology catalogue | Create/update routes return `503` before a service record changes; retirement returns `503` before deletion. |`
- `13: | Nursing catalogue | Create/update routes return `503` before a service record changes; retirement returns `503` before soft deletion. |`
- `14: | Browser catalogue manager | The page is an explicit unavailable surface; it does not list operational catalogue data or permit create/edit/delete actions. |`
- `23: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `26: | Branch upload | **PASS** — archive commit `7dd7466` (`fix: contain ungoverned admin catalog publication`) is pushed to `manus/on-live-reconciliation`. |`
- `30: No clinical service, package, price, availability, result time, media URL, patient booking, provider selection or catalogue history was read, created or modified. This containment does not implement catalogue governance. Before reopening it`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AP: admin service-catalog publication containment`
- `22: | Admin source contracts | **PASS** — 7/7, including explicit catalogue publication containment. |`
- `23: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `25: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `5f59cf5ca7515228bf035c2fbf6aa1caa114dfb316da12b47ff2a18fa7abfda0`. |`
- `26: | Branch upload | **PASS** — archive commit `7dd7466` (`fix: contain ungoverned admin catalog publication`) is pushed to `manus/on-live-reconciliation`. |`
- `30: No clinical service, package, price, availability, result time, media URL, patient booking, provider selection or catalogue history was read, created or modified. This containment does not implement catalogue governance. Before reopening it`
### state_transitions
- `5: The catalogue manager made laboratory, radiology and nursing services available for immediate creation, modification and deletion, including patient-facing name, price, turn-around time, images and activation state. These changes could affe`
### payment_insurance_relevance
- `5: The catalogue manager made laboratory, radiology and nursing services available for immediate creation, modification and deletion, including patient-facing name, price, turn-around time, images and activation state. These changes could affe`
- `30: No clinical service, package, price, availability, result time, media URL, patient booking, provider selection or catalogue history was read, created or modified. This containment does not implement catalogue governance. Before reopening it`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
