# Nabd — revised evidence-first production remediation plan

**Author:** Manus AI
**Date:** 2026-08-27
**Status:** artifacts-only plan; **NO-GO** for production readiness
**Applies to:** Patient Mobile, Patient Web, Provider, Admin, shared Backend/Data/Platform

> This plan supersedes no product code and does not accept a commit, screen, route, green local total, or a narrative handoff as proof of completion. A work item is eligible for implementation only after its contract, owner, authority, source scope, and test design are explicitly approved. It becomes release-eligible only after source review, deterministic tests, approved isolated runtime evidence, and operational acceptance.

## 1. Current decision

The incoming source snapshot has material Web/Mobile/Backend additions but is an unrelated, one-commit sanitized tree. It is missing the Provider application, the Admin frontend and specific Mobile configuration/contracts. The snapshot also contains confirmed defects in governed pharmacy and booking paths. Therefore no implementation, merge, migration, build, deployment, or live-data operation begins from this plan by default.

| Decision | Status | Basis |
|---|---|---|
| Use incoming snapshot as merge candidate | **No** | No shared Git ancestry with `main`; historical commit objects unavailable; source scope incomplete. |
| Credit Provider or Admin completion claims | **No** | Provider source and Admin frontend source are absent. |
| Treat current routes as production-complete | **No** | Static source defects and absent runtime/PSP/payer/actor proof. |
| Preserve proven static work as review inputs | **Yes, conditionally** | Each source slice can be reused only after contract reconciliation and gate passage. |
| Begin remediation automatically | **Not yet** | First contract slices must be approved; all work remains artifacts-only until source/authority prerequisites are supplied. |

## 2. Governing business journeys to preserve

The plan locks the patient payment semantics below. No UI copy, local state, BFF convenience flow, or legacy endpoint may alter them. The Backend is authoritative for price, availability, provider assignment, insurance decision, confirmation and financial state.

| Journey | Correct sequence | Non-negotiable guardrails |
|---|---|---|
| Pharmacy — card/wallet | Cart → validate address/Rx → submit → geo-eligible pharmacy broadcast → offers with availability/substitution/price/ETA/version → patient chooses one **specific offer** → atomic reservation/lock → server quote → card/wallet intent → verified webhook/ledger → prepare/dispatch/delivery. | No payment before offer choice; client never sets price/stock; offer expires/requotes; no duplicate selection/payment; patient can cancel/reselect only under explicit state rules. |
| Pharmacy — COD | Same journey through atomic offer selection → explicit COD/deferred collection consent → fulfillment → delivery proof → collection settlement/failed collection/reconciliation. | COD is not “paid”; it is a defined `cod_pending_collection` financial state with allocation, collection actor and exception handling. |
| Pharmacy — insurance | Same journey through offer selection → pharmacy/payer decision full/partial/reject → patient notified → full confirmation or co-pay intent/verified payment → fulfillment; reject permits an explicit cash/COD switch or cancel. | Policy/coverage is not an approval; only authorized decision writes coverage. Per-item substitution requires consent/audit. |
| Consultation | Select licensed clinician/service/slot → server reserves slot → card/cash-payment intent before confirmation → verified payment → confirmation → call token/visit → clinical record and post-care. | A `pending_payment` booking cannot expose confirmed-only actions/call entry. Slot hold expiry, payment failure, webhook replay, cancel/reschedule are mandatory. |
| Consultation — insurance | Select clinician/service/slot → insurance request without patient payment → authorized provider/payer decision → full confirmation or co-pay intent → verified co-pay → confirmation. | Reject must offer an intentional cash alternative/cancel, not silently confirm or abandon a slot. |
| Lab/Radiology/Home-care/Nursing | Select service/provider/slot/address → cash/card payment before confirmation; for insurance request first, then provider/payer decision, co-pay if any, then payment and confirmation → operations/service-result handoff. | Each vertical has explicit eligibility, provider capacity, clinical/operational handoff, result/privacy and exception states. |

## 3. Completion standard for every route, CTA and state

Every screen/route/CTA receives multiple contract rows—one for every meaningful step, not one row per screen. A row cannot use `N/A`, a generic sentence, or an inferred keyword match as evidence.

| Required contract-row field | Required evidence / owner |
|---|---|
| Surface, actor, exact route/screen and entry state | Mobile/Web/Provider/Admin route and product owner. |
| CTA and next state | Frontend file/line, user-visible copy, client state and navigation. |
| Request/event | Exact HTTP method/path or socket event; request/response DTO and idempotency behavior. |
| Backend path | Controller → service → DTO/schema → finite state transition, with line evidence. |
| Authorization | Authentication, role, tenant/organization, resource ownership and delegation enforcement. |
| Source of truth | Catalog/quote, stock, provider capacity/slot, insurance decision or finance ledger source; no client computation. |
| Financial semantics | Intent, payment provider callback/webhook verification, ledger, receipt, COD/co-pay/refund/payout state. |
| Counterparty operation | Provider/Admin action, notification, SLA queue, resolution and patient-visible outcome. |
| Negative states | Unauthorized, wrong owner, invalid data, conflict/race, replay, expired, unavailable, failure/retry and cancel/reverse. |
| Evidence class | `CONFIRMED_DEFECT`, `STATIC_MATCHED_PARTIAL`, `RUNTIME_REQUIRED`, `INSUFFICIENT_EVIDENCE`, or `MISSING_CAPABILITY` with a custom reason. |

A semantic validator must reject a row if it lacks journey-specific CTA evidence; an exact endpoint/method match or an explicit mismatch classification; ownership/role anchors; authority source; relevant payment rule; specific provider/admin/result evidence; or distinct happy and negative transitions. Historical mechanical anchors remain preserved only as `REJECTED_MECHANICAL_ANCHOR`; they never seed a build backlog.

## 4. Phase plan

### Phase 0 — restore auditable scope and make decisions

**Objective.** Establish a reviewable source baseline before any product remediation.

| Workstream | Required work | Exit evidence |
|---|---|---|
| Git provenance | Obtain a non-sanitized branch/archive that contains the claimed commits or a signed mapping from each claim to a content hash; record merge-base/heads and immutable source hashes. | Reproducible commit-to-file delta; no statement based solely on the current orphan snapshot. |
| Source completion | Supply complete Provider app source, Admin frontend source, all shared contracts, Mobile Firebase configuration ownership/restriction record, and known excluded uncommitted changes. | Manifest with checksums, application roots, dependency lockfiles and licensing status. |
| Ownership board | Name Product, Backend/Data, Security, Privacy, Clinical Safety, Finance/PSP, Payer/Insurance, Provider Operations, Admin Operations, Support/SRE and Content/SEO owners. | Decision register with owner, approver, scope, deadline, expiry and escalation route. |
| Contracts manifest | Create the multi-row coverage manifest for every patient, Provider and Admin screen/CTA/state; assign a contract-slice owner. | Validator passes only genuine evidence rows; unresolved rows become explicit backlog or blockers. |
| Policy decisions | Record card/cash terminology, COD collection operator, refund/return windows, pharmacy substitutions, insurance approval source, data retention, locales, public indexing and AI/emergency boundaries. | Signed policy/contract decisions; no defaults invented in frontend code. |

**Phase 0 blocking inputs:** complete Provider/Admin sources; actual original Git history or immutable source mapping; contract owner decisions for pharmacy insurance/COD; isolated approved test environment. These are evidence inputs, not optional later enhancements.

### Phase 1 — shared platform, IAM, PHI and cross-cutting correctness

**Objective.** Build a consistent trusted boundary before connecting further mutations.

| Stream | Implementation scope after approval | Mandatory proof |
|---|---|---|
| Identity/session | Account creation, guest rules, password/OTP/social sign-in, refresh/revocation/device/session management, MFA/re-auth and account recovery. | Owner/stranger/unauth/device-limit/replay/logout/revocation tests; cookie/token storage review; security runbook. |
| Authorization | Central role/permission/tenant/organization/delegation policy for patient, guardian, provider staff, pharmacy, clinician, operator, admin and super-admin. | Route inventory proves every privileged operation uses policy; escalation/cross-tenant/expired delegation negative tests. |
| PHI/consent | Consent version/language/purpose/time, minimum scopes, guardian/delegation expiry/revocation, audit events, export/delete/retention/legal holds. | Privacy data-flow review, access logs, consent revoke test, subject-rights workflow and incident procedure. |
| API/event contracts | Versioned DTOs/OpenAPI/async events, idempotency standards, correlation IDs, error taxonomy, pagination, rate limits, event schemas and backward compatibility. | Consumer contract tests; schema drift gate; endpoint method/path checks before every mutation implementation. |
| Data authority | Reconcile identifiers (`patient_id` versus `patient_account_id`), timestamps/money currency precision, state enums, document keys and tenant keys across all models. | Migration/backfill design, duplicate/conflict reports, dry-run and rollback plan; no uncontrolled writes. |

**Immediate must-fix defects carried into Phase 1:**

1. Normalize PharmacyOrder ownership in payment and insurance engines: both payment intent and insurance request paths currently read `patient_id` while PharmacyOrder creation/schema writes `patient_account_id`.
2. Add explicit provider role/eligibility/tenant enforcement to insurance queues and decision operations; ID comparison alone is insufficient policy evidence.
3. Remove state-changing GET/SSR behavior from Pharmacy Web selection and preserve active locale in all route transitions.
4. Remove `@ts-nocheck` from money, booking, authentication, clinical and security paths before accepting type-check evidence.

### Phase 2 — finance, payment service and payer controls

**Objective.** Create one safe financial state machine shared by all verticals.

| Capability | Required implementation | Non-negotiable tests |
|---|---|---|
| Payment intent lifecycle | Server-priced immutable quote/snapshot; stable operation idempotency key; one active intent policy; PSP tokenization; hosted checkout callback return; signature verified webhook; reconciliation and receipts. | Intent create/retry/fail/cancel/expiry/webhook duplicate/out-of-order/amount mismatch/PSP outage tests. |
| Ledger | Double-entry or clearly governed ledger, immutable event references, balances, fees/commission/tax rules, transaction correction/reversal rules and reconciliation jobs. | Ledger conservation, reconciliation mismatch, idempotent posting, operator approval/audit tests. |
| COD | Explicit order/allocation COD pending, collection proof, partial/failed/refused collection, courier/provider settlement, refund/dispute/payout adjustment. | No COD order appears `paid` before collection; delivery/collection/reconciliation exception tests. |
| Wallet/loyalty/coupons | Server validation at quote and settlement, eligibility/caps, atomic debit/credit, expiry/refund reversal, fraud/rate controls. | Quote cannot be trusted as settlement; concurrent redemption/balance/rollback tests. |
| Payer/insurance | Policy verification vs final decision, provider/payer decision record, co-pay quote, payment linkage, full/partial/reject/resubmit/appeal/cancel state rules. | Owner/provider/admin/tenant matrix; full, partial, reject, expired, repeated decision, co-pay failure/success, cash alternative and cancellation tests. |

No UI treatment that says “paid”, “confirmed”, “covered”, or “refunded” may exist unless the corresponding server state and ledger event are proven.

### Phase 3 — pharmacy end-to-end vertical

**Objective.** Remediate PHARM-001 through PHARM-007 as one coherent multi-actor workflow.

| Slice | Required scope | Exit criteria |
|---|---|---|
| 3.1 Intake and broadcast | Cart, prescription requirements, address/geofence, no-service-area, eligible pharmacy targeting, broadcast lifetime/rounds and opt-out. | Policy-backed eligibility; deterministic no-pharmacy/expired/Rx-invalid/cancel paths. |
| 3.2 Offers and atomic selection | Provider-issued offer ID/revision, per-item availability/substitution/price/ETA/fees, patient comparison, explicit substitution consent, one atomic selected allocation. | Two valid simultaneous selection tests prove exactly one winner; conditional failure causes no orphan allocation/order; expire/withdraw/reselect is reconciled. |
| 3.3 Payment branches | Card, wallet, COD and insurance immediately after selected offer, including receipt and status route. | Stable operation keys and no two-write orphan sequences; owner/stranger/replay tests. |
| 3.4 Insurance branch | Pharmacy/payer decision queue, full/partial/reject, co-pay or intentional alternate/cancel, notifications. | Fixed owner lookup and provider authorization; tests for all insurance transitions. |
| 3.5 Fulfillment and aftercare | Prepare, substitute consent, ready, dispatch, delivery proof, COD collection, support/chat, return/refund/dispute, provider payout correction. | Patient/Provider/Admin actions and notifications proven; finance reconciliation completed. |
| 3.6 Surface parity | Mobile and Web exact route/CTA/state coverage, accessible and locale-aware. | Web includes explicit COD and insurance user paths; Mobile transmits only valid server-accepted checkout choices; no `/ar` hardcoding in locale routes. |

### Phase 4 — unified clinical bookings: consultations, labs, radiology, home-care and nursing

**Objective.** Deliver cash-before-confirmation and insurance-after-decision behavior in each service class without copying broken local logic.

| Vertical | Required contract slices | Mandatory exceptions |
|---|---|---|
| Consultations | discovery → provider → slot hold → card intent → verified payment → confirmation → call token → documentation/post-care; separate insurance branch. | slot collision/hold expiry, payment failure, reschedule/cancel, clinician unavailable/no-show, call access before confirmation. |
| Labs | package/test/provider/address/time → availability/quote → cash payment or insurance request → booking → sample barcode/chain of custody → QC/TAT/result release. | invalid prep, specimen rejection, slot failure, result correction, insured co-pay/reject. |
| Radiology | service/modality/facility/slot → payment or insurance decision → check-in/scan/review/publish → PHI-controlled report/image. | missing referral, contraindication/prep, no-show, report amendment, storage authorization. |
| Home-care/Nursing | service/care plan/qualified provider/zone/slot/address → payment or insurance decision → assignment/arrival/geofence/vitals/signature → service completion. | unassigned shift, unsafe location, missed visit, supervisor escalation, clinical emergency, co-pay/reject. |

The static Web PATCH reschedule route may be retained as a source input because its method aligns with backend code, but it remains `RUNTIME_REQUIRED` until complete authorization, slot conflict, replay, notification and user-facing outcome proof passes.

### Phase 5 — Patient Mobile and Patient Web completeness/experience

**Objective.** Achieve faithful functional parity—not literal copying—over the authoritative contract rows.

| Work package | Required work | Definition of done |
|---|---|---|
| Screen/route manifest | Reconcile all prior 246 Mobile and 246 Web audited entries plus new source surfaces into one versioned catalog. | Every route/CTA is `implemented+proven`, `blocked with reason`, or `not in approved product scope`; no “probably complete.” |
| Journey UI | Build all patient screens for pharmacy, booking verticals, orders, payments, insurance, prescription, chat, health, family, notifications, support, returns/reviews and settings only on contract-ready slices. | Loading/empty/error/offline/retry/cancel/blocked/authorization state exists for every critical journey. |
| Design system | Premium brand system: tokenized color/typography/spacing/radius/elevation, semantic states, vector icon set, focus/hover/disabled/loading states, motion tokens, reduced-motion policy, RTL/LTR adaptive layout. | Design review and WCAG 2.2 AA evidence; no emoji substituting product icons; no unreviewed external branding. |
| Localization | Locale-safe routes, direction metadata, number/date/currency formatting, Arabic/English content, pluralization, screen-reader labels and input order. | No locale hardcoding; RTL/LTR device/browser matrix passes. |
| Truthful data | Remove mock/fake success and local authoritative finance/availability/clinical values. Placeholder inputs used solely as examples are labeled and do not represent persisted outcomes. | Screen data authority table, no fake outcome tests, production-safe empty/blocked states. |
| Accessibility and performance | Keyboard, focus management, semantic HTML, contrast, touch target, form validation, image optimization, caching boundaries, error boundaries, code splitting and RUM. | Automated + human a11y tests and performance budgets on critical routes. |

### Phase 6 — Provider application and provider operations

**Objective.** Complete the missing Provider audit before building or accepting any lifecycle claims.

| Provider domain | Required workflow | Security/operations controls |
|---|---|---|
| Organization/onboarding | organization/branch/staff identity, licenses, contracts, bank/payout eligibility, verification, suspension/revocation. | tenant isolation, least privilege, proof expiry, audit/review/appeal. |
| Pharmacy | broadcast inbox → offer authoring/revision → stock reservation → insurance decision → prep/substitution → dispatch/delivery → COD/returns. | stock authority, provider staff role, patient consent, money/queue audit. |
| Clinician | availability, slots, consultation start/end, call/documentation, prescriptions/referrals/sick leave and follow-up. | patient relationship, clinical license, PHI/scope, escalation and clinical audit. |
| Lab/Radiology | acceptance, roster/assignment, sample/scan, QC, report upload/review/signature/release. | chain of custody, role separation, secure objects, result version/provenance. |
| Nursing/Home-care/Ambulance | job dispatch, care plan, arrival/visit/route/handover, vitals/signature/incident/cancel. | geofence is not sole proof; safety escalation, operator dispatch and audit logs required. |
| Provider support/finance | queues, SLA, cancellations, complaints, payouts/invoices/disputes/settlements. | reasons, attachments, audit, reconciliation, access revocation. |

No Provider work begins until the actual source tree and contracts are supplied. The first deliverable is a Provider CTA-to-backend audit; then only evidence-supported contract slices can become build tasks.

### Phase 7 — Admin control plane and governance

**Objective.** Complete the missing Admin frontend audit and implement safe enterprise operations.

| Admin area | Required outcome | Mandatory guardrails |
|---|---|---|
| IAM/governance | Admin role composition, just-in-time elevation, organization/provider/staff approval/suspension/revocation. | reason/evidence/expiry, dual approval for high-risk actions, immutable audit and notification. |
| Operations command | live queues for pharmacy, bookings, emergency, support and provider incidents; controlled intervention/reassignment/escalation. | tenant-aware controls, defined SLA/ownership, rollback/cancel, no direct unsafe state mutation. |
| Finance | PSP reconciliation, COD collection, refunds/disputes/chargebacks, provider settlements, ledger anomalies. | segregation of duties, financial reasons, export access and review. |
| Content/catalog/SEO | clinical/content review, catalog governance, provider data quality, public indexing lifecycle. | clinical/editorial ownership, provenance, approval and unpublish/404/410 history. |
| Privacy/security | subject rights, consent/audit records, security events, abuse/fraud queue, key/config rotation visibility. | minimum access, downloadable PHI controls, audit retention and incident playbooks. |
| Analytics/reporting | verifiable metrics from documented data definitions, scheduled reports/run history. | no chart without source/control; PII minimization; failed jobs visible and actionable. |

### Phase 8 — clinical safety, content, AI and emergency controls

**Objective.** Do not expose clinical-looking experiences without operational ownership and fail-safe behavior.

| Capability | Required prerequisites | Exit proof |
|---|---|---|
| AI triage, translation, skin tools, interaction hints | clinical owner, approved intended use/exclusions, provenance/grounding, model/data policy, escalation path and feature flag. | Safety evaluation, unsafe-input/rate/abuse tests, record of human review and rollback. |
| Emergency SOS | dispatch partner/service ownership, location consent/accuracy policy, explicit notice, cancellation/false-alarm/handover and 24/7 operational runbook. | Tabletop/live authorized drill, queue/on-call acknowledgement, audit and patient safety review. |
| Mental health/nutrition/maternity | clinical content/owner, crisis escalation, measurement validity and medical-data consent. | Safety sign-off and workflows for dangerous results/inputs. |
| Public health content | author, reviewer, sources, publication/update/expiry facts and moderation. | Editorial workflow and visible factual metadata match structured data. |

### Phase 9 — public discovery, SEO/GEO/AEO and content operations

**Objective.** Enable discovery only where legal, privacy and content readiness permit it.

| Workstream | Required implementation | Gate |
|---|---|---|
| Indexing policy | Define public/private/indexable entity classes; private health/account/order/payment screens remain noindex and non-discoverable. | Legal/product approval and automated robots/meta/canonical tests. |
| Public templates | Canonical URLs, HTTP 200 for valid public records, useful visible text, location/price/updated facts only where true, internal category/city links, media alt text. | Crawl test confirms no empty/thin/placeholder public pages. |
| Structured data | `Product`/`Offer` only for true offers, `ItemList`, `BreadcrumbList`, professional/organization/article schemas only when visible and complete. | Schema validation and UI-to-JSON-LD equivalence test. |
| Sitemap/lifecycle | sitemap partitioning, canonical/hreflang, creation/update/removal events, correct 404/410 policy and change audit. | Crawlable sitemap contains only eligible canonical pages. |
| IndexNow/GEO/AEO | Queue notifications only after public-indexing approval; original evidence-led Arabic/English content, citations and AI answer monitoring. | No automatic submission of private, provisional or incorrect data. |

### Phase 10 — reliability, performance, security validation and operations

**Objective.** Prove the system can be run safely at scale, not merely build locally.

| Control | Required definition / test |
|---|---|
| SLO/SLA | Numerically define availability, latency, error, payment/webhook, booking/offer, notification and support targets with error budgets and owners. |
| Observability | Structured/PHI-safe logs, traces/correlation IDs, metrics/dashboards, redaction, alert routing, synthetic checks and release markers. |
| Capacity | Load/soak/spike tests for discovery, authentication, cart/broadcast, payment intents/webhooks, booking/slots, sockets and queue backlogs; database/index/cache analysis. |
| Resilience | Multi-instance socket strategy, retries/backoff/dead-letter/reconciliation for events, graceful degraded states, CDN/object storage protections. |
| Disaster recovery | Encrypted backups, restore and point-in-time recovery drills, RPO/RTO targets, dependency/provider outage playbooks and evidence. |
| Security assurance | Threat model, SAST/dependency/license/secret/container/IaC scans, independent penetration test, authorization fuzzing, CSP/CORS/rate/abuse checks and remediation of all critical/high findings. |
| Release operations | CI from clean lockfiles, immutable artifacts/SBOM, signed/enforced deployments, schema migration/backfill/rollback plans, feature flags, progressive rollout and incident command. |

### Phase 11 — evidence-led release process

**Objective.** Replace declarations of “ready” with a signed evidence package.

| Gate | Required evidence |
|---|---|
| Engineering verification | Clean reproducible typecheck/lint/build, unit/integration/contract suites, coverage quality—not just totals—and mutation matrices linked to immutable Git source. |
| Isolated runtime | Approved non-production environment with synthetic-only accounts/data; API method/path checks; owner/stranger/unauth/replay/concurrency/webhook tests; full teardown. |
| Device/browser | Patient Mobile devices/OS versions and Patient Web browser/RTL/accessibility matrix, including payment return/deep-link cases. |
| Operational acceptance | Provider, Admin, Finance, Support and Clinical owners perform scripts, queues, SLA and incident drills. |
| Privacy/security | Risk review, pen-test remediation, data processing/retention/consent evidence and secrets/config review. |
| Formal GO | Written multi-owner approval listing residual risks, mitigations, named owner and expiry. No unresolved critical/high defect or missing mandatory source allowed. |

## 5. Immediate remediation backlog, ordered by risk

This is a **plan**, not authorization to modify code. It identifies the first bounded contract slices once Phase 0 approves scope and owners.

| Priority | Bounded slice | Evidence-triggered reason | Required result before next slice |
|---|---|---|---|
| P0-1 | Pharmacy identity/ownership normalization | `patient_id` vs `patient_account_id` breaks payment and insurance owner lookup. | Approved canonical owner field/migration, source change, owner/stranger/admin tests, rollback. |
| P0-2 | Atomic pharmacy offer selection | Allocation/order writes precede unchecked lock update; request lacks specific offer identity. | Transaction/CAS design, unique offer revision, race/replay/rollback tests. |
| P0-3 | Pharmacy Web intentional mutation flow | GET-rendered selection, Arabic hardcoding, no visible COD/insurance paths. | POST-only confirm, locale safe navigation, explicit cash/card/COD/insurance branches and accessibility tests. |
| P0-4 | Mobile pharmacy truthfulness | Checkout exposes payment/insurance choices then omits them in actual order request. | Contract change or removal/blocked state; no deceptive choice; full Mobile test cases. |
| P0-5 | Consultation cash continuation | `pending_payment` has no visible payment continuation on Web. | Payment CTA/return state and confirmed-only controls; payment/webhook tests. |
| P0-6 | Insurance decision authorization | Provider decision code lacks explicit provider eligibility/role rule. | Central policy enforcement and patient/provider/admin/tenant negative tests. |
| P0-7 | Reproducible test harness | Absolute paths/fixed E2E secret/missing provider dependences invalidate claimed runtime gate. | Clean environment configuration, synthetic fixtures, secure secrets injection, teardown and artifact reports. |
| P0-8 | Source recovery | Missing Provider/Admin source and uncommitted contracts prevent complete audit. | Checksummed complete source and verified original history. |

## 6. Prohibited shortcuts

The following are release blockers, not acceptable workarounds:

- Treating isolated snapshot documentation, comments, commit messages, file names, test counts, green local terminal output, or a route decorator as full journey proof.
- Computing price, coverage, stock, provider decision, payment success, clinical result, or booking confirmation in a client surface.
- Calling a state-changing API from GET rendering, link prefetch, or an unsafe background action.
- “Fixing” missing contracts with mock success, hardcoded content, hidden local fallback, or a silent UI state.
- Starting Provider/Admin implementation from the absent source or declaring parity because a backend controller exists.
- Running runtime tests, gateway probes, migrations or deployments against production data as a substitute for an approved isolated environment.

## 7. Artefacts required for the next review

| Artifact | Owner | Minimum content |
|---|---|---|
| Complete-source manifest | Engineering | SHA-256, Git heads/ancestry, all application roots, shared contracts, exclusions and dependency lockfiles. |
| Contract coverage manifest | Product/Backend + surface owners | Multiple validated rows per journey action, linked to source paths and test IDs. |
| State-machine package | Backend/Data + Finance/Payer | Diagrams, DTOs, authorization, idempotency, transition tables, financial event/ledger rules and migration plan. |
| Test plan and raw reports | QA/Security/SRE | Test data isolation, exact commands/environment, raw output, source hash, pass/fail/skip rationale and teardown. |
| Provider/Admin audit reports | Separate owners | Full screen/CTA/route/role/tenant/queue/notification review over supplied complete source. |
| Release evidence package | Release board | All Phase 11 gates, residual-risk register, named owners and formal GO decision. |

## 8. Relationship to current evidence

This plan incorporates rather than erases the prior baseline production blueprint, screen/route matrix, Mobile and Web source consolidations, incoming provenance record, tree delta inventory and current delta ledger. It **removes no backlog item** merely because a claim says it was built. A backlog item may be moved to `CLOSED_BY_SOURCE_ONLY` only when the exact source chain is present; it remains `RUNTIME_REQUIRED` until the associated test and operational evidence is complete.

**Current next action:** obtain the Phase 0 missing sources/history/owner decisions and authorize the first P0 contract slice. Until then, continue only artifacts-only inspection and review.
