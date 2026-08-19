# Phase 8 — Batch AH: admin campaign-delivery governance

## Purpose

The notification center could create campaigns/broadcasts under a fixed actor name, compose broad or raw-user audiences and arbitrary deep links, and claim success after generic client calls. It also exposed a manual retargeting trigger without a documented consent, review or safety boundary.

## Source change

| Surface | Implemented control |
|---|---|
| Authenticated attribution | Broadcast and campaign endpoints now pass the authenticated admin identifier to the service; `created_by` is no longer the literal `'admin'`. |
| Audience guardrails | Bulk campaigns require explicit `audience_confirmed`; allowed segments are restricted to supported patient/provider role groups, and raw user targets must use a bounded identifier then resolve to a real user. |
| Message, link and schedule validation | Backend bounds message fields, rejects unsafe/non-app deep-link routes, and permits future schedules only inside a 31-day window. |
| Delivery state | Campaign delivery rejects an empty resolved audience instead of returning a terminal sent state. |
| Admin UI acknowledgement | Create, broadcast, send-now and cancellation actions check `ok` from the server before showing positive state or refreshing results. The UI requires operator audience confirmation for bulk send. |
| Manual retargeting | The browser trigger was removed and replaced with an explicit unavailable policy message. Scheduled service code remains untouched; no retargeting was invoked. |

## Verification

| Gate | Result |
|---|---|
| Focused Backend campaign-governance contract | **PASS** — 4/4: bulk audience confirmation, unsafe deep-link rejection, actual admin attribution, and controller session identity propagation. |
| Backend regression suite | **PASS** — 61 suites, 361 tests. |
| Backend production build | **PASS** — `nest build`. |
| Admin source contracts | **PASS** — 2/2, covering contained governance portal plus campaign audience/acknowledgement/retargeting controls. |
| Next production build | **PASS** — clean-environment `next build`, TypeScript/compile/prerender, 34 static admin routes. |
| Backend archive integrity | **PASS** — `unzip -tq`; SHA-256 `62c01f2eed7d2e118912e649bd6af7f46ab626602aa8018b861b2c4a848c1851`. |
| Admin archive integrity | **PASS** — `unzip -tq`; SHA-256 `0c63ba3af69a446cae19537cdea7988594c65f077dc049f4ed07e122781697fd`. |
| Branch upload | **PASS** — archive commit `2436a06` (`fix: govern admin campaign delivery`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

No push notification, campaign, retargeting request, suppression/consent record, user data or production/sandbox audience was read, created or altered. This work does not establish legal consent, communications policy, two-person campaign approval, push-provider delivery confirmation or immutable audit retention. Phase 11 must execute reviewer-authorized sandbox acceptance across permitted/denied roles, malformed segments/deep links/schedules, duplicate send behavior, cancellation, target-user validation, real notification records and opt-in/suppression boundaries.
