# Phase 0B semantic evidence — assignment-strategy.service.ts

**Archive member:** `src/modules/provider/services/assignment-strategy.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–130 and 131–242; full 242-line member covered.

## Identity and request dispatch

Lines 14–22 define provider-role and admin assertions. Lines 24–34 construct the strategy with request/attempt repositories, matching, notifications and scoring services. Lines 36–74 implement `createAndDispatch`: create a pending unassigned request with patient/payload/summary/amount/schedule/location, `matching` assignment state, selected strategy, attempted IDs and seeded flag, then immediately dispatch with a timeout default of 120 seconds.

Lines 76–150 implement dispatch. It loads by request ID, returns already-assigned if applicable, asks matching for up to ten candidates, stores match breakdown, cancels the request when none are eligible, or for AUTO_BEST/MANUAL assigns the top candidate as pending with timeout, creates one pending attempt and notifies the provider. BROADCAST selects top three, marks broadcasted, creates attempts and notifications for each. Unknown strategies return a structured failure without changing the request.

## Manual assignment and lifecycle hooks

Lines 152–184 implement admin-only manual assignment, load request by ID, reject active assignment, assign a supplied provider account for 120 seconds, append attempt history, create pending attempt and notify the provider. There is no visible verification that the selected provider is eligible, active, capable, available or in the expected tenant.

Lines 186–207 handle provider rejection: mark attempt response, skip rerouting for manual strategy, fail after five attempted provider IDs, otherwise clear provider assignment, reset to matching/pending, save and redispatch. Lines 209–217 mark an accepted attempt and cancel sibling pending attempts by request ID. Lines 219–237 expire stale attempts by scanning pending expired records, mark each timed out, reload requests, invoke rejection/reroute for pending requests and return counts. Lines 239–241 list attempts by request ID without caller context.

**Security/ownership:** normal provider assertions apply only to helper wrappers; `dispatch`, `onProviderRejected`, `onProviderAccepted`, `expireStale`, and `listAttempts` have no caller/tenant context in this member and rely on internal boundaries. `listAttempts` can expose all attempts for arbitrary request IDs if controller exposure is insufficiently protected. Manual assignment is admin-authenticated but trusts provider ID.

**Mutation integrity:** request creation, assignment, attempt creation, notifications and saves are sequential without transaction/outbox/idempotency. Concurrent dispatch/accept/reject/expiry can assign multiple providers, create duplicate attempts, or reroute after acceptance. `updateMany` sibling cancellation is not visibly conditional on request state/version. Expiry scans and updates are not lock-protected and may double-process across workers.

**Truthfulness/financial:** missing amount defaults to zero and may be propagated; patient data and summaries are copied into notifications. Matching score breakdown is persisted but its provenance is delegated. Timeout defaults are fixed and no SLA/priority or provider-specific policy is visible. `createAndDispatch` can cancel immediately when no candidates without durable recovery/alerting.

**State transitions:** pending/matching → assigned or broadcasted; no candidates → cancelled/failed; provider rejection → matching/reroute or failed; attempt pending → accepted/rejected/timed_out/cancelled. State updates are not visibly CAS-protected.

**Price/payment/insurance source:** `amount_total` is accepted from input/default zero; no authoritative price, currency, payment, insurance or ledger verification is visible.

**Event/privacy:** notifications include request summaries and may expose patient-related content; no dedupe, event IDs, retry/dead-letter or room/access policy is visible. Notification failure can interrupt some flows while assignment hooks/scoring errors are swallowed elsewhere.

**Test implications:** require owner/stranger/unauth/admin tests, provider eligibility/tenant checks, exact attempt visibility, concurrent dispatch/accept/reject/expiry tests, idempotency and transaction/outbox coverage, provider availability/capability checks, timeout/SLA rules, amount/currency/ledger validation, PII minimization, notification reliability and audit completeness. No tests executed during this semantic read.
