# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AN_ADMIN_NURSING_PRIVACY_ASSIGNMENT_CONTAINMENT_20260819.md`
- **Member SHA-256:** `62484e43d34b87348b75e9a72708e5bf6eb7fe9df2b52290942e79f2f640eccd`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: The nursing portal queried unassigned home-care bookings and rendered patient name, service type and address. It then accepted a browser `prompt()` value as a nurse/provider identifier and directly updated the booking assignment. The server`
- `11: | Home-care request visibility | The admin nursing request list now returns `503` before querying home-care bookings or exposing patient/address fields. |`
- `12: | Direct assignment | The assignment endpoint now returns `503` before resolving an arbitrary provider profile or updating a booking. |`
- `20: | Focused Backend nursing containment | **PASS** — 1/1, confirms read/assignment routes are fail-closed in source. |`
- `24: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `27: | Branch upload | **PASS** — archive commit `64ab8dc` (`fix: contain ungoverned admin nursing operations`) is pushed to `manus/on-live-reconciliation`. |`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AN: admin nursing privacy and assignment containment`
- `11: | Home-care request visibility | The admin nursing request list now returns `503` before querying home-care bookings or exposing patient/address fields. |`
- `23: | Admin source contracts | **PASS** — 5/5, including explicit nursing portal unavailability and no PHI/direct assignment claim. |`
- `24: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `26: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `de12598b1a3460ed86913d52c3d111132a96afe96f1502a9fe8c19003dfefd68`. |`
- `27: | Branch upload | **PASS** — archive commit `64ab8dc` (`fix: contain ungoverned admin nursing operations`) is pushed to `manus/on-live-reconciliation`. |`
- `31: No home-care request, address, patient identity, nurse/provider identity, assignment, notification or audit event was read, created or modified. This does not authorize or complete a nursing assignment workflow. Before reopening any admin o`
### state_transitions
- `13: | Browser portal | The portal is an explicit unavailable state; it does not load requests, display patient/address data or present a free-text nurse assignment action. |`
- `31: No home-care request, address, patient identity, nurse/provider identity, assignment, notification or audit event was read, created or modified. This does not authorize or complete a nursing assignment workflow. Before reopening any admin o`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
