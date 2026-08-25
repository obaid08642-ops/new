# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AI_ADMIN_SOS_PRIVACY_DISPATCH_CONTAINMENT_20260819.md`
- **Member SHA-256:** `112fcf4857c4ef2942b0985fab2e14f3f6667d5a68326e69ef9b6e7f2706144e`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The admin SOS monitor polled broad emergency records, displayed patient identity, telephone and precise location, accepted a raw hospital identifier, and permitted browser-based resolution. Although the HTTP routes had admin-role metadata, `
- `12: | Manual dispatch and closure | Admin assign, auto-dispatch and resolve routes return `503` before any service method can write hospital assignment, dispatch state, closure note or location-related state. |`
- `13: | SOS monitor | The page is an explicit unavailable surface; it does not poll, render PHI/location or expose hospital assignment/resolve actions. |`
- `14: | Scope preservation | Patient-owned SOS routes and the separately verified ambulance vehicle claim/tracking path were not exercised or made operational by this change. |`
- `24: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `27: | Branch upload | **PASS** — archive commit `4f73d5c` (`fix: contain unapproved admin SOS controls`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AI: admin SOS privacy and dispatch containment`
- `5: The admin SOS monitor polled broad emergency records, displayed patient identity, telephone and precise location, accepted a raw hospital identifier, and permitted browser-based resolution. Although the HTTP routes had admin-role metadata, `
- `11: | Admin emergency read | `GET /emergency/active` and `GET /emergency/:id` retain their admin role metadata but return `503` before listing or exposing an emergency record. |`
- `12: | Manual dispatch and closure | Admin assign, auto-dispatch and resolve routes return `503` before any service method can write hospital assignment, dispatch state, closure note or location-related state. |`
- `20: | Focused Backend SOS containment | **PASS** — 1/1, asserts every administrative list/detail/assign/dispatch/resolve entry point fails with `503`. |`
- `23: | Admin source contracts | **PASS** — 3/3, including explicit SOS unavailability and no PHI/browser dispatch claim. |`
- `24: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `26: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `67498f4d1852439fb02e9adc3c0048bdec762d0d45778b395b82d5e1d5393648`. |`
- `27: | Branch upload | **PASS** — archive commit `4f73d5c` (`fix: contain unapproved admin SOS controls`) is pushed to `manus/on-live-reconciliation`. |`
- `31: No emergency, location, patient identity, hospital assignment, dispatch, resolution, notification or audit record was read, created or modified. This containment does not authorize SOS dispatch or clinical emergency closure. Before re-openi`
### state_transitions
- `5: The admin SOS monitor polled broad emergency records, displayed patient identity, telephone and precise location, accepted a raw hospital identifier, and permitted browser-based resolution. Although the HTTP routes had admin-role metadata, `
- `12: | Manual dispatch and closure | Admin assign, auto-dispatch and resolve routes return `503` before any service method can write hospital assignment, dispatch state, closure note or location-related state. |`
- `27: | Branch upload | **PASS** — archive commit `4f73d5c` (`fix: contain unapproved admin SOS controls`) is pushed to `manus/on-live-reconciliation`. |`
- `31: No emergency, location, patient identity, hospital assignment, dispatch, resolution, notification or audit record was read, created or modified. This containment does not authorize SOS dispatch or clinical emergency closure. Before re-openi`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
