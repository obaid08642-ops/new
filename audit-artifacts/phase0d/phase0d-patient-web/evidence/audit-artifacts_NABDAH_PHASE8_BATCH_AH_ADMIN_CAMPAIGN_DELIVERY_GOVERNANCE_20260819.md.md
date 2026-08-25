# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_BATCH_AH_ADMIN_CAMPAIGN_DELIVERY_GOVERNANCE_20260819.md`
- **Member SHA-256:** `74683440b7dbf8f7fa7697f046cb134da73778dd88969f990bedec458a3cdc92`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: | Message, link and schedule validation | Backend bounds message fields, rejects unsafe/non-app deep-link routes, and permits future schedules only inside a 31-day window. |`
- `15: | Admin UI acknowledgement | Create, broadcast, send-now and cancellation actions check `ok` from the server before showing positive state or refreshing results. The UI requires operator audience confirmation for bulk send. |`
- `26: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `29: | Branch upload | **PASS** — archive commit `2436a06` (`fix: govern admin campaign delivery`) is pushed to `manus/on-live-reconciliation`. |`
- `33: No push notification, campaign, retargeting request, suppression/consent record, user data or production/sandbox audience was read, created or altered. This work does not establish legal consent, communications policy, two-person campaign a`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `1: # Phase 8 — Batch AH: admin campaign-delivery governance`
- `11: | Authenticated attribution | Broadcast and campaign endpoints now pass the authenticated admin identifier to the service; `created_by` is no longer the literal `'admin'`. |`
- `12: | Audience guardrails | Bulk campaigns require explicit `audience_confirmed`; allowed segments are restricted to supported patient/provider role groups, and raw user targets must use a bounded identifier then resolve to a real user. |`
- `15: | Admin UI acknowledgement | Create, broadcast, send-now and cancellation actions check `ok` from the server before showing positive state or refreshing results. The UI requires operator audience confirmation for bulk send. |`
- `22: | Focused Backend campaign-governance contract | **PASS** — 4/4: bulk audience confirmation, unsafe deep-link rejection, actual admin attribution, and controller session identity propagation. |`
- `25: | Admin source contracts | **PASS** — 2/2, covering contained governance portal plus campaign audience/acknowledgement/retargeting controls. |`
- `26: | Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |`
- `28: | Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `0c63ba3af69a446cae19537cdea7988594c65f077dc049f4ed07e122781697fd`. |`
- `29: | Branch upload | **PASS** — archive commit `2436a06` (`fix: govern admin campaign delivery`) is pushed to `manus/on-live-reconciliation`. |`
- `33: No push notification, campaign, retargeting request, suppression/consent record, user data or production/sandbox audience was read, created or altered. This work does not establish legal consent, communications policy, two-person campaign a`
### state_transitions
- `5: The notification center could create campaigns/broadcasts under a fixed actor name, compose broad or raw-user audiences and arbitrary deep links, and claim success after generic client calls. It also exposed a manual retargeting trigger wit`
- `12: | Audience guardrails | Bulk campaigns require explicit `audience_confirmed`; allowed segments are restricted to supported patient/provider role groups, and raw user targets must use a bounded identifier then resolve to a real user. |`
- `14: | Delivery state | Campaign delivery rejects an empty resolved audience instead of returning a terminal sent state. |`
- `15: | Admin UI acknowledgement | Create, broadcast, send-now and cancellation actions check `ok` from the server before showing positive state or refreshing results. The UI requires operator audience confirmation for bulk send. |`
- `33: No push notification, campaign, retargeting request, suppression/consent record, user data or production/sandbox audience was read, created or altered. This work does not establish legal consent, communications policy, two-person campaign a`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `14: | Delivery state | Campaign delivery rejects an empty resolved audience instead of returning a terminal sent state. |`
- `15: | Admin UI acknowledgement | Create, broadcast, send-now and cancellation actions check `ok` from the server before showing positive state or refreshing results. The UI requires operator audience confirmation for bulk send. |`
- `33: No push notification, campaign, retargeting request, suppression/consent record, user data or production/sandbox audience was read, created or altered. This work does not establish legal consent, communications policy, two-person campaign a`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
