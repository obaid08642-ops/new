# Nabd — incoming snapshot delta ledger

**Audit date:** 2026-08-27
**Baseline archive reference:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Incoming remote snapshot:** `quarantine/workstation-source-51a84c7 @ 6d4d42fed4673f89961e0e403469ce1e3c5458dc`
**Audit mode:** source/artifact-only; no source installation, build, runtime test, migration, merge, deployment, production API call, or live-data operation.

> **Decision boundary.** This ledger does not decide production readiness. It is a source-provenance and gap-delta audit. An item can be *implemented in the supplied source* and still remain `RUNTIME_REQUIRED`; a claim can be historically plausible and still be `INSUFFICIENT_EVIDENCE` where its claimed commit objects, complete source, contracts, or execution proof are unavailable.

## 1. Evidence rules and vocabulary

| Field | Meaning |
|---|---|
| `Audit classification` | One of the evidence-first classes: `CONFIRMED_DEFECT`, `STATIC_MATCHED_PARTIAL`, `RUNTIME_REQUIRED`, `INSUFFICIENT_EVIDENCE`, or `MISSING_CAPABILITY`. |
| `Delta disposition` | **Not** a production decision. `CLOSED_BY_SOURCE_ONLY` means the requested static chain is present but must still pass contract/runtime evidence; `PARTIAL` means some chain is present but a required step is absent/ambiguous; `STILL_OPEN` means an identified gap remains; `BLOCKED_SCOPE` means required source is absent; `UNVERIFIED_CLAIM` means history/gate evidence is unavailable. |
| Evidence locator | Exact file and line ranges in the incoming snapshot where reviewed; a catalog reference is explicitly non-semantic. |
| Boundary | The missing contract, authorization, counterparty source, test, runtime proof, or decision required before advancing. |

## 2. Provenance and completeness delta

| Claim / comparison subject | Baseline gap / control | Evidence | Audit classification | Delta disposition | Result |
|---|---|---|---|---|---|
| “63 unique commits / 67 categorizations” distributed across three sessions | Git provenance control | Snapshot remote head has **one** root commit; no merge-base with `main`. Of 50 hashes extracted from supplied Handoff/review documents, zero object is present in snapshot Git database. See `INCOMING_WORKSTATION_SNAPSHOT_PROVENANCE_AND_INITIAL_DELTA_2026-08-27.md:14–21`. | `INSUFFICIENT_EVIDENCE` | `UNVERIFIED_CLAIM` | The claimed fixes cannot be reviewed commit-by-commit or attributed to the listed hashes. This does **not** label their underlying code false. |
| “Provider P1–P9 complete” | Provider source review / operational actor completion | `provider/SOURCE_MISSING.md`; manifest `WORKSTATION_UPLOAD_MANIFEST.json:8–18`; baseline Provider source has 83 files while incoming has none. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | No Provider UI/logic/test can be credited, rejected, or planned at screen-level from this upload. |
| “Admin Dashboard complete” | Admin source/UI, IAM, operations, finance workflow review | Incoming includes backend admin modules but no independent Admin frontend/dashboard tree. Baseline Admin frontend has 66 files; incoming has none. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | Backend controller presence does not prove an Admin UI, its workflows, roles, notifications, queues or accessibility. |
| “All gates green / TSC and test totals” | Reproducible quality gate | Manifest states source was not installed/imported/executed/tested while snapshot was made. `backend/e2e/run-all-gates.js:2–35` requires built services/local ports and an absent absolute Provider path; `e2e/pharmacy-scenarios.js:1–36` uses a local absolute dependency and fixed E2E secret. | `INSUFFICIENT_EVIDENCE` | `UNVERIFIED_CLAIM` | No reported gate total can be accepted as a result for immutable `6d4d42fe` until a reproducible approved harness runs. |
| “Complete Mobile integration” | Mobile release/integration evidence | Manifest excludes `GoogleService-Info.plist`, `google-services.json`, and uncommitted `packages/shared-contracts/src/patient-contracts.ts`. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | Push/analytics/Firebase configuration and uncommitted contract work are outside supplied evidence. |
| File-level source delta | Change inventory control | `INCOMING_WORKSTATION_FILE_LEVEL_TREE_DELTA_2026-08-27.tsv` has 3,262 rows of byte-hash comparison from extracted baseline archives to the unrelated snapshot: Backend 48 modified / 37 incoming-only; Mobile 13 modified / 2 incoming-only; Web 40 modified / 95 incoming-only. | `RUNTIME_REQUIRED` | `PARTIAL` | A byte delta proves neither regression nor closure; it narrows review targets only. |

## 3. Patient Mobile + Patient Web delta against critical baseline gaps

### 3.1 Pharmacy governed journey — PHARM-001 through PHARM-007

| Baseline gap | Incoming source that is actually present | Exact evidence | Audit classification | Delta disposition | What remains before any closure |
|---|---|---|---|---|---|
| `PHARM-001` — cart/submit → geo broadcast | Backend patient order create/submit and Web/Mobile offer reads are present. | Backend controller/service: `backend/src/modules/pharmacy/pharmacy.controllers.ts:18–44`; Web helper `patient-web/lib/api/pharmacy-flow.ts:64–74`; Mobile checkout `patient-mobile/app/pharmacy/checkout.tsx:160–184`. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Web create→submit has no durable idempotency/recovery key. Mobile displays choices it does not transmit. Geo eligibility, Rx validation and no-service-area behavior need explicit contract, authority and runtime evidence. |
| `PHARM-002` — offer cards with availability, substitutions, price, ETA | Offer comparison pages/cards exist in both patients surfaces. | Web `app/[locale]/pharmacy/offers/page.tsx:8–72`; Mobile `app/pharmacy/offers.tsx:39–126`; backend selection `pharmacy-broadcast.service.ts:382–445`. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Cards are source-present and display quantity/substitution/price/ETA fields, but selection has no unique offer binding. Authoritative inventory/pricing freshness, offer expiry/requote, consent and Provider issuance cannot be closed without Provider source and runtime proof. |
| `PHARM-003` — atomic selected-offer reservation | A selection endpoint and allocation creation are present. | `pharmacy-broadcast.service.ts:382–445` pre-reads lock, writes allocation/order, then attempts a late conditional broadcast lock without checking update result; `pharmacy.schema.ts:347–381` has no structural atomic selection constraint. | `CONFIRMED_DEFECT` | `STILL_OPEN` | Implement transaction or first atomic compare-and-set with a verified result; bind request to a unique offer revision/ID; perform rollback/reconciliation; test concurrent valid selections, expiry/withdraw/reselect and replay. |
| `PHARM-004` — card/COD payment, webhook, ledger | Card/wallet intention, COD endpoint and server price lookup are source-present. | Web card/wallet forms `app/[locale]/pharmacy/pay/page.tsx:10–18,48–90`; Mobile COD/card `app/pharmacy/payment.tsx:73–124,247–270`; payment service `backend/src/modules/payments/payments.module.ts:143–224`. | `CONFIRMED_DEFECT` | `STILL_OPEN` | For `pharmacy-order`, payment authorization and persisted transaction use `patient_id`, while PharmacyOrder creation/schema use `patient_account_id`: `payments.module.ts:151–170,202`; `pharmacy.schema.ts:112–114`; `pharmacy-order.service.ts:46–48`. Owner payment will not follow this model correctly. PSP webhook, ledger, receipt, retry and COD collection evidence remains runtime-required. |
| `PHARM-005` — insurance decision → co-pay/alternative | Generic insurance routes and conditional Mobile UI exist; no complete pharmacy insurance user flow exists. | Web contains no pharmacy insurance CTA/state path; `app/[locale]/pharmacy/pay/page.tsx:86–89` only offers wallet/card. Insurance service maps pharmacy but finds `{patient_id}` at `insurance-engine.module.ts:258–273`, incompatible with PharmacyOrder owner schema. | `CONFIRMED_DEFECT` | `STILL_OPEN` | Fix owner field; establish explicit offer-selected insurance request, pharmacy decision authority, full/partial/reject/co-pay states, patient payment/intentional cash-or-cancel alternate, notification and Provider/Admin queues. |
| `PHARM-006` — fulfillment/tracking/return/refund/support | Some generic refund/support source is present. | Handoff claims routes; no Provider source is supplied. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | No pharmacy provider lifecycle from prepare/dispatch/deliver/proof/COD settlement to return/refund/payout can be closed without Provider source, backend lifecycle proof and counterparty execution tests. |
| `PHARM-007` — scanner/manual/compare/chat/reorder | Mobile source includes broader surfaces and Web has scan/compare/chat BFF additions. | Mobile pharmacy directory includes scanner/manual/chat/reorder; Web catalog lists `/api/drug-scanner`, `/api/medicines/compare`, chat routes. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | These extension surfaces do not close core money/insurance/fulfillment. Each needs its own clinical policy, permissions, data provenance and no-placeholder verification. |

### 3.2 Explicit source regressions / unresolved defects

| Finding ID | Surface and user impact | Exact source evidence | Audit classification | Delta disposition |
|---|---|---|---|---|
| `SNAP-WEB-003` | Web create/submit pharmacy retry may create a partially completed duplicate sequence. | `patient-web/app/api/pharmacy/orders/route.ts:3–7` delegates to `lib/api/pharmacy-flow.ts:64–70`, which issues create then submit without an idempotency key. Payment forms themselves use deterministic per-order/channel keys at `app/[locale]/pharmacy/pay/page.tsx:10–18`. | `STATIC_MATCHED_PARTIAL` | `STILL_OPEN` |
| `SNAP-WEB-004` | A GET-rendered route changes selection state. | `patient-web/app/[locale]/pharmacy/select/page.tsx:12–35` obtains cookies then POSTs `select-offer` while rendering query-based GET. A comment cannot make a state-changing GET CSRF-safe. | `CONFIRMED_DEFECT` | `STILL_OPEN` |
| `SNAP-WEB-005` | Locale is lost / forced Arabic in pharmacy selection. | `patient-web/app/[locale]/pharmacy/select/page.tsx:19,35` uses `/ar`; `components-next/offer-select-button.tsx:19–29` also pushes `/ar/pharmacy/pay`. | `CONFIRMED_DEFECT` | `STILL_OPEN` |
| `SNAP-WEB-006` | COD is exposed only as an unconnected BFF endpoint, not a user choice. | COD BFF exists at `app/api/pharmacy/orders/[orderId]/cod/route.ts:1–10`; inspected offer/pay pages `offers/page.tsx:37–72`, `pay/page.tsx:64–91` offer only selection plus wallet/card. | `MISSING_CAPABILITY` | `STILL_OPEN` |
| `SNAP-WEB-007` | The pharmacy insurance branch is absent from the inspected Patient Web journey. | No pharmacy insurance request/decision/co-pay/alternate action source is reachable in Patient Web; generic insurance pages are not an offer-selected pharmacy flow. | `MISSING_CAPABILITY` | `STILL_OPEN` |
| `SNAP-MOB-PHARM-009` | Mobile displays card/cash/wallet/insurance choices but drops them before governed pharmacy create. | Options at `patient-mobile/app/pharmacy/checkout.tsx:99–114,310–340`; `payload.payment_method` is constructed at `136–157` but the actual `/patient/pharmacy/orders` payload at `165–176` omits those values. | `CONFIRMED_DEFECT` | `STILL_OPEN` |
| `SNAP-MOB-PHARM-010` | Mobile card/COD screens are source-present but inherit the unsafe offer selection and cannot prove insurance entry. | Mobile explicit select `app/pharmacy/offers.tsx:39–55`; COD/card presentation `app/pharmacy/payment.tsx:73–124,247–270`. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` |
| `SNAP-WEB-BOOK-012` | Web cash consultation says “pay now” but lands in a pending booking with no payment CTA. | Booking form `components-next/appointment-booking-form.tsx:14–33`; BFF accepts `pending_payment` at `app/api/appointments/book/route.ts:76–78`; appointment detail has no payment intent UI at `app/[locale]/appointments/[appointmentId]/page.tsx:31–42`. | `CONFIRMED_DEFECT` | `STILL_OPEN` |

### 3.3 Consultation insurance and unified-booking source slice

| Claim | Evidence present in snapshot | Audit classification | Delta disposition | Boundary |
|---|---|---|---|---|
| PATCH reschedule BFF is corrected | Web BFF uses `PATCH /unified-bookings/consultation/:id/reschedule` with same-origin, auth, payload validation and idempotency: `app/api/appointments/[appointmentId]/reschedule/route.ts:12–26`. Backend controller accepts `@Patch(':kind/:id/reschedule')`: `unified-bookings.module.ts:439–462`. | `STATIC_MATCHED_PARTIAL` | `CLOSED_BY_SOURCE_ONLY` | Ownership, slot conflict, idempotent replay, notification and runtime HTTP method behavior remain required. |
| Unified booking create/cancel/call-token routes exist | `unified-bookings.module.ts:444–469` has JWT guard and decorated create/cancel/call-token paths; route catalog has 93 literal Web upstream calls and 74 candidate literal backend matches. | `RUNTIME_REQUIRED` | `PARTIAL` | The catalog is only an index. Every journey needs DTO/state/role/payment/provider/notification proof; current Patient Web cash payment continuation is defective. |
| Consultation insurance request and co-pay code exists | BFF creates an insurance request after booking at `app/api/appointments/book/route.ts:55–74`; insurance lifecycle and appointment mirror code at `insurance-engine.module.ts:268–292,367–455`. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Insurance request POST lacks an explicit idempotency key in BFF; failure leaves a booking without a compensating/retry protocol. Provider UI source is absent and provider role enforcement is deficient. |
| Provider insurance decision is protected | `InsuranceFlowController` has only `JwtAuthGuard`: `insurance-engine.module.ts:501–538`; service ID checks lack an explicit provider role/eligibility assertion at `338–372`. | `CONFIRMED_DEFECT` | `STILL_OPEN` | Add role+tenant+provider-entitlement enforcement and test patient/provider/admin negative cases. |

## 4. Claimed Patient Web parity batches (#13–#33)

The incoming snapshot adds multiple BFF routes/components corresponding to the claimed family, health, maternity, nutrition, mental-health, AI, scanner, loyalty, offers, provider map, support, refunds, ratings, settings, programs, emergency, community, wearables and medicine comparison groups. The catalog records 93 literal BFF upstream calls and 1,405 backend decorator candidates, but it expressly marks every row `CATALOG_ONLY_NOT_A_CONTRACT_OR_JOURNEY_PROOF`.

| Claimed batch | Incoming source indication | Audit classification | Delta disposition | Why it is not production-closed |
|---|---|---|---|---|
| F-web #15–#19: family, health, maternity, nutrition, mental health | New BFF routes/components appear under `patient-web/app/api/{family,health,maternity,mental-health}` and `components-next/*forms*`. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Screen/CTA presence does not establish role/delegation/PHI provenance, authority for measurements, parent/child consent, clinical safety, notification or Web/Mobile parity. |
| F-web #20–#21: AI and drug scanner | `app/api/drug-scanner/route.ts`, `components-next/ai-tools.tsx`, `drug-scanner-tools.tsx` present. | `INSUFFICIENT_EVIDENCE` | `PARTIAL` | No clinical owner/safety decision, model provenance, medical disclaimer/escalation, image/data retention or runtime test was supplied. |
| F-web #22–#23: loyalty/offers | `app/api/loyalty/route.ts`, `components-next/loyalty-actions.tsx`, pharmacy payment quote source present. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Quote presence is not redemption/ledger settlement proof; the supplied handoff itself leaves an owner decision for custom redeem. |
| F-web #24–#27: map, support, refunds, ratings | BFF routes/components for support/refund/ratings and endpoint catalog exist. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Provider/Admin counterparty queues/source are absent; SLA, eligibility, abuse/moderation, financial reconciliation and notifications are unproven. |
| F-web #28–#33: settings, programs, emergency, community, wearables, compare | BFF routes/components exist and dynamic action routes use explicit action patterns/Zod in inspected community/support code. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | Exact backend contracts and negative state paths were not reconciled for each CTA. Emergency/clinical features require safety/operations proof, not route presence. |
| H-web #13: realtime chat and attachments | Scoped token BFF and gateway membership checks are source-present. | `STATIC_MATCHED_PARTIAL` | `PARTIAL` | `chat.gateway.ts:125–145` trusts client lifecycle state for relay (`SNAP-CHAT-007`); process-local Maps at `28–30` do not scale across instances. No Provider peer source or live socket evidence. |
| H-web #14: push/deep links | Push route/component files are present; Firebase config excluded. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | Device credentials, browser permissions, delivery, deep-link authentication and opt-out cannot be verified. |

## 5. Backend/Admin/Provider delta

| Claimed area | Source evidence | Audit classification | Delta disposition | Required next evidence |
|---|---|---|---|---|
| A1 RBAC hierarchy / reason rule | `backend/src/common/rbac.ts:7–80` defines `super_admin ⊇ admin`, no implicit provider inheritance, reason lengths and permission sanitization. | `STATIC_MATCHED_PARTIAL` | `CLOSED_BY_SOURCE_ONLY` | Trace every privileged controller to effective role/tenant/permission policy; test cross-tenant/role escalation and audit events. Current insurance provider decision shows this is not universally enforced. |
| A7 command center / scheduled reports | Backend Admin modules are present in the snapshot, including command-center/scheduled-report source. | `INSUFFICIENT_EVIDENCE` | `PARTIAL` | Admin frontend missing; scheduler data accuracy, email credentials, authorization, audit/event history, backlog and run outcomes are runtime-required. |
| Provider P2/P3/P4–P7 lifecycle and 9 endpoints | Backend additions and narrative claims only; complete Provider application absent. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | Complete Provider repository/tree, original ancestry, contract matrix and executable owner/tenant/lifecycle tests for every vertical. |
| Admin enterprise plan (finance, ops, CMS, CRM, privacy) | Backend controller/module names are source-present. | `INSUFFICIENT_EVIDENCE` | `BLOCKED_SCOPE` | Admin frontend, granular permissions, workflow UI, audit facts, queue effects, export controls and operator acceptance drills. |

## 6. Quality, security, and operational gates remaining

| Control | What the source proves | Audit classification | Remaining exit evidence |
|---|---|---|---|
| Pharmacy test coverage | Backend broadcast tests cover reject and automated best-partial behavior; `governing-rules.js` is sequential/create/read/invalid-offer only. No named Web/Mobile pharmacy route test found. | `STATIC_MATCHED_PARTIAL` | Deterministic tests for owner/stranger/unauth, replay, two valid concurrent selects, expiry, inventory withdrawal, card success/failure/webhook replay, COD settlement and insurance co-pay/reject. |
| Type safety in Mobile | `@ts-nocheck` appears in 201 Mobile files, including 10 snapshot-modified files such as pharmacy checkout/offers/payment. | `STATIC_MATCHED_PARTIAL` | Remove or tightly justify every suppression in money/booking/security paths; run strict typecheck on complete source. |
| Realtime security/scale | Thread-scoped JWT and membership lookup are source-present. | `STATIC_MATCHED_PARTIAL` | Server lifecycle validation, token expiry/reconnect behavior, CORS, rate/abuse controls, Redis/adapter multi-instance tests and media access tests. |
| E2E portability | Scripts make environment-specific assumptions and the Provider source dependency is absent. | `CONFIRMED_DEFECT` | Replace absolute paths/fixed secrets with isolated environment injection, reproducible dependency lockfiles and teardown assertions; execute only in an approved non-production environment. |
| No fake/placeholder data | Keyword scan produces candidates but no mass classification is valid from terms alone; actual Mobile checkout has a concrete discarded-choice defect. | `INSUFFICIENT_EVIDENCE` | Screen-by-screen evidence of source authority, empty/error/loading/blocked state, API contract and runtime data trace; no fake success may be inferred away. |

## 7. Current delta verdict

The incoming snapshot contains **material source additions and several genuine static improvements**, for example an explicit Web PATCH reschedule route aligned with the current backend controller and a scoped chat-token/member-check design. However, it also contains **confirmed defects in high-risk flows**: pharmacy payment owner mismatch, non-atomic offer selection, pharmacy insurance owner mismatch, missing explicit provider-role enforcement for insurance decisions, GET-triggered offer selection, Mobile discarded cash/insurance selections, and a Web cash appointment path with no payment continuation.

The snapshot therefore does **not** close the baseline pharmacy or booking readiness gaps. Provider and Admin closure claims are out of scope due to absent UI source; all historical commit and “green gate” claims remain unverified from the supplied Git history. The project remains **NO-GO** for production readiness pending the revised plan’s contracts, source completion and evidence gates.

## 8. Artifact references

- `INCOMING_WORKSTATION_SNAPSHOT_PROVENANCE_AND_INITIAL_DELTA_2026-08-27.md`
- `INCOMING_WORKSTATION_FILE_LEVEL_TREE_DELTA_2026-08-27.tsv`
- `INCOMING_PATIENT_WEB_BFF_BACKEND_ROUTE_CATALOG_2026-08-27.tsv`
- `NABD_MAIN_BASELINE_GAPS_REMEDIATION_REGISTER_AND_BRANCH_COMPARISON_2026-08-26.md`
- Supplied claim indexes: `/home/ubuntu/upload/pasted_content_6.txt`, `/home/ubuntu/upload/pasted_content_7.txt`, and incoming `HANDOFF.md`.
