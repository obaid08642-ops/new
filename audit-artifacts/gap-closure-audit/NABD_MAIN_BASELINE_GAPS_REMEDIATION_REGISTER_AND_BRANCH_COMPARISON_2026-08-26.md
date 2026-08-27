# Nabd: baseline `main`، سجل الفجوات وخطة العلاج، وبروتوكول مقارنة الفرع الجديد

**baseline المرجعي:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**فرع artifacts الحالي:** `agent/audit-main-contract-inventory @ 6f27b1998f6df737d814a668e98dbfb23c8bce7a` وقت إعداد هذا السجل.

**الغرض:** أن يكون هذا هو سجل الخط الأساس الذي تقارن عليه أي branch جديد؛ فيمنع تكرار ما أُصلح، ويمنع إغلاق gap بلا دليل.

> **تصحيح مهم:** لا يصح أن أقول إن كل ملف source في مستودع `main` قد خضع لفحص سطر-بسطر أو إن كل backend/runtime/Provider/Admin قد أُغلق. الذي يثبته سجل الأدلة هو مراجعة يدوية شاملة لجرد Patient Mobile وPatient Web، ومراجعة Provider مصدرية تاريخية محدودة، مع artifacts تدقيق سابقة. لا يوجد تدقيق يدوي مكتمل مستقل لـAdmin، ولا reconciliation end-to-end لكل Backend/Data/integration. وهذه ليست فجوة شكلية؛ بل جزء من baseline الذي يجب أن يغلق قبل الإنتاج.

## 1. ما تم فحصه فعليًا على أساس source baseline

| Surface | مستوى الفحص المثبت | ما يعنيه | ما لا يعنيه |
|---|---|---|---|
| Patient Mobile source checkout | 246/246 route/screen candidate؛ أدلة مسارات وأسطر موزعة على 38 artifact. | كل مرشح شاشة/route راجعه تدقيق يدوي واكتشف فيه evidence/contract gap أو finding. | لا يثبت backend، PSP/payer، runtime device، authorization الحقيقي أو readiness. |
| Patient Web source checkout | 246/246 parity candidates؛ 242 صفًا مفقودًا أو جزئيًا داخل matrix، و4 صفوف أخرى بتصنيفات source. | surface/CTA mapping يدوي وتوثيق ما هو موجود/غائب أو جزئي. | لا يثبت visual parity أو contract/live behavior أو أن كل Web source file فُحص سطرًا بسطر. |
| Provider source | 45/45 قراءة مصدرية تاريخية. | يوجد baseline أولي للسطوح المقروءة. | لا يثبت الرحلات أو العقود أو readiness أو runtime. |
| Admin source | لا تدقيق يدوي مكتمل مثبت. | لا شيء يُغلق أو يُفترض. | لا يجوز ادعاء اكتمال أو تحديد إصلاحات نهائية قبل audit. |
| Backend/Data | أدلة/عقود متفرقة سابقة، لكنها ليست reconciliation كامل لكل CTA/route/event. | نقاط بداية للعقود. | لا يثبت كل service/controller/DTO/schema/authorization/event/ledger. |
| Branch audit diff | فرع artifacts لا يُعامل كتنفيذ product؛ فرق المسار الحالي عن `main` احتوى artifacts إضافة إلى `.gitignore` سابق. | لا نخلط artifacts مع إصلاحات المنتج. | لا يثبت أن product source جرى إصلاحه. |

## 2. سجل فجوات baseline — كل ما نعرفه الآن

`Status` هنا ليس claim runtime. معانيه: `CONFIRMED_SOURCE_DEFECT`، `STATIC_OR_SOURCE_PARTIAL`، `MISSING_SURFACE`، `CONTRACT_RUNTIME_REQUIRED`، أو `AUDIT_REQUIRED`.

### 2.1 Shared Backend/Data, security, platform

| Gap ID | الحالة | المشكلة/الفجوة | التصحيح اللازم | دليل إغلاق قبل الإطلاق |
|---|---|---|---|---|
| SHARED-IAM-001 | `CONFIRMED_SOURCE_DEFECT` / `CONTRACT_RUNTIME_REQUIRED` | تناقضات identity/OTP/reset وفصل غير مثبت بين user/guest/session، وfallback guest بعد 401/403 ظاهر في Mobile API client. | account/session model موحد؛ OTP/2FA/reset/signup/logout/device revoke؛ لا fallback صامت؛ rate limit/risk/audit. | API/DTO/state, owner/stranger/unauth tests, replay/expiry, runtime session test. |
| SHARED-AUTHZ-002 | `CONTRACT_RUNTIME_REQUIRED` | لا evidence end-to-end لكل ownership/tenant/role/family rule. | central policy/gateway guards، resource/tenant checks، ABAC/RBAC، test vector لكل read/mutation/event. | server evidence + negative authorization tests + audit. |
| SHARED-PHI-003 | `STATIC_OR_SOURCE_PARTIAL` | PHI/family/share/QR/legal controls ليست برهان consent أو enforcement أو retention. | consent versioning، purpose limitation، delegation scope/expiry/revoke، audit/export/delete/retention. | privacy DSR/consent/delegation runtime tests and audit evidence. |
| SHARED-CONTRACT-004 | `CONTRACT_RUNTIME_REQUIRED` | لا register كامل يربط CTA → API/event → controller/service/DTO/schema/state. | versioned contract registry، OpenAPI generated from source، contract testing، error semantics. | row-level reconciliation for every launched mutation/event. |
| SHARED-EVENT-005 | `CONTRACT_RUNTIME_REQUIRED` | realtime/broadcast/notification/result delivery وretries غير مثبتة. | outbox/idempotent consumers/schema versioning/DLQ/correlation IDs. | duplicate/retry/order/failure tests and telemetry. |
| SHARED-DATA-006 | `AUDIT_REQUIRED` | canonical IDs، duplicates، data quality، lifecycle، migrations/backups لم تُراجع بالكامل. | data inventory/classification/integrity/freshness/backup/restore/migration policy. | data report, migration rehearsal, restore drill. |
| SHARED-OPS-007 | `AUDIT_REQUIRED` | SLOs, alerting, on-call, incident runbooks, capacity, DR غير مثبتة. | SRE baseline, observability, runbooks, load/resilience/restore testing. | pilot evidence and operational acceptance. |

### 2.2 Identity, profile, privacy and family

| Gap ID | Products affected | الحالة | المطلوب بناءه/تصحيحه | السيناريوهات التي يجب إغلاقها |
|---|---|---|---|---|
| ID-001 | Mobile + Web + Backend | `CONFIRMED_SOURCE_DEFECT` | login/signup/OTP/reset/2FA/session/device/logout flows بعقد واحد. | invalid/expired/replayed OTP، lockout، session expiry, refresh failure, cross-device revoke, recovery. |
| ID-002 | Mobile + Web | `MISSING_SURFACE` / partial | onboarding locale/legal/permission/identity states متسقة وtruthful. | new/existing/verified/unverified/blocked/deleted account; language persistence; legal reaccept. |
| ID-003 | Mobile + Web | `STATIC_OR_SOURCE_PARTIAL` | social/guest flow فقط إن كان server policy يسمح؛ otherwise remove. | social collision, guest conversion, existing session, auth failure, anti-abuse. |
| PROF-004 | Mobile + Web | `MISSING_SURFACE` / partial | profile and address CRUD مع validation/serviceability/default address وaudit. | invalid/unserviceable/duplicate/default/delete/geo permission/network loss. |
| FAM-005 | Mobile + Web + Backend | `CONFIRMED_SOURCE_DEFECT` / partial | invite/accept/decline/scope/time/revoke، guardian/minor policy، activity view. | expired invite, denied delegation, revoke during use, role change, access attempt after expiry. |
| PRIV-006 | Mobile + Web + Admin | `MISSING_SURFACE` / partial | privacy center: consent, data access/export/delete, notification/privacy controls, re-auth. | consent version, withdrawal, export pending/ready/failed, deletion blocked by retention, audit. |

### 2.3 Pharmacy, orders, delivery and returns

| Gap ID | الحالة | baseline gap | التصحيح/البناء الإلزامي | acceptance journey |
|---|---|---|---|---|
| PHARM-001 | `CONFIRMED_SOURCE_DEFECT` / partial | catalog/cache/cart/Rx/manual order لا يثبت cart→geo broadcast→offers. | server cart + submit/address/Rx validation + eligible pharmacy broadcast. | submit duplicate/no-service-area/Rx-invalid/no pharmacy response. |
| PHARM-002 | `MISSING_SURFACE` | لا evidence offer cards each with stock/substitution/price/ETA/expiry. | offer schema/lifecycle/provider console/patient comparison screen. | partial availability, substitution require consent, price expiry/requote, multiple offers. |
| PHARM-003 | `MISSING_SURFACE` | لا selected-offer atomic lock. | reservation/selection transaction, offer expiry/release/race handling. | concurrent selection, pharmacy withdraw, patient reselect. |
| PHARM-004 | `STATIC_OR_SOURCE_PARTIAL` | cash/card/COD UI/outcomes لا تثبت payment/collection state. | PSP intent/webhook/ledger; explicit COD deferred collection policy. | auth/capture/fail/retry/webhook replay/COD collection failure. |
| PHARM-005 | `MISSING_SURFACE` | insurance journey missing. | select pharmacy → payer/pharmacy decision full/partial/reject/co-pay → patient choice/payment → fulfillment. | expired decision, co-pay fail, reject→cash/cancel, partial coverage. |
| PHARM-006 | `MISSING_SURFACE` | fulfillment, tracking, support, delivery proof, return/refund incomplete/absent. | provider prepare/dispatch/deliver/issue plus patient support/return/refund, finance reconciliation. | provider cancel, delivery failed, wrong item, return eligible/ineligible, refund/payout adjustment. |
| PHARM-007 | `MISSING_SURFACE` | Web lacks scanner/manual order/compare/chat/reorder and related completion states. | build only after core offer flow; integrate camera/Rx/auth/content policy. | permission denied, unknown product, chat availability, reorder changed price/Rx. |

### 2.4 Consultations, calls and post-care

| Gap ID | الحالة | baseline gap | required correction/build | scenarios |
|---|---|---|---|---|
| BOOK-001 | `STATIC_OR_SOURCE_PARTIAL` | client filtering/general handoff and insufficient server authority for provider/price/slot. | unified discovery, authoritative provider/capacity/quote/slot hold. | no availability, stale quote, hold expiry, double booking, timezone. |
| BOOK-002 | `MISSING_SURFACE` / partial | payment/insurance/confirmation sequencing not proven. | cash/card before confirmation; insurance request no payment then decision/co-pay/payment/confirmation. | payer full/partial/reject, PSP fail/retry, provider rejects after hold. |
| BOOK-003 | `MISSING_SURFACE` | incomplete cancellation/reschedule/no-show policy screens/actions. | policy-aware patient/provider/admin flows and financial adjustments. | cutoff/fee, reschedule conflict, provider cancel, no-show dispute. |
| CALL-004 | `STATIC_OR_SOURCE_PARTIAL` | room/token/device/leave/end lifecycle not proven; Web lacks multiple call/postcare surfaces. | booking-bound short-lived token, room isolation, waiting/device checks, leave/end/audit. | token expiry, unentitled join, camera/mic denial, network reconnect, provider absent. |
| CARE-005 | `MISSING_SURFACE` | chat, follow-up, prescription/report share, rating/review eligibility missing or partial. | secure post-care workflows after confirmed delivery only. | consent, attachment, moderation, clinical escalation, review rejection. |

### 2.5 Labs, radiology, home-care and nursing

| Gap ID | الحالة | baseline gap | remediation | scenarios |
|---|---|---|---|---|
| DIAG-001 | `STATIC_OR_SOURCE_PARTIAL` | catalog/detail/read booking lacks complete selection/provider/slot/quote flow. | service/provider/home eligibility and unified booking contract. | prep requirements, unserviceable address, slot expiry, quote change. |
| DIAG-002 | `MISSING_SURFACE` | comparison/cart/checkout/insurance/upload/tracking/result history surfaces missing in Web. | build only from provider/payer/report contracts; no catalog-only confirmation. | insurance result, technician delay, no sample, reschedule, report unavailable. |
| DIAG-003 | `CONTRACT_RUNTIME_REQUIRED` | reports/results provenance, signing, correction, secure export/share not proven. | clinical document/result model and patient/provider/admin access rules. | amendment, revoked result, delegated access, upload failure, signed report view. |
| HOME-004 | `MISSING_SURFACE` / partial | nursing/home-care cash/insurance/filters and assignment/visit lifecycle insufficient. | assessment/address/caregiver/slot/quote/payment or coverage/assignment/arrival/completion. | caregiver late, safety issue, scope change, patient no-show, visit incomplete. |

### 2.6 Health, clinical information, content and safety

| Gap ID | الحالة | baseline gap | remediation | scenarios |
|---|---|---|---|---|
| HEALTH-001 | `STATIC_OR_SOURCE_PARTIAL` | health hub aggregation/local label mutation/fallback appointment ID; reports/vitals/chronic data mostly summaries. | real read/write boundaries, provenance/freshness, no fallback IDs, correction/audit. | missing data, stale data, denied PHI, corrected record, delegation revoked. |
| HEALTH-002 | `MISSING_SURFACE` | Web lacks many health actions: conditions/allergies, health ID, medication/refill/reminder actions, wearables. | implement only as governed clinical/PHI features. | medication conflict, reminder failure, record correction, device sync conflict. |
| CLIN-003 | `CONFIRMED_SOURCE_DEFECT` / safety | static/fabricated AI or health improvement claims; no evidence clinical grounding/safety. | clinical governance, sources/citations, guardrails, uncertainty/refusal/escalation/evaluation. | red flags, self-harm/crisis, unsupported query, hallucination, stale source. |
| EMERG-004 | `MISSING_SURFACE` / safety | no proven SOS/location/dispatch/acknowledgement/failure operations. | country/SOP/responder integration/consent/failure-mode runbook or hide. | denied location, responder unavailable, false alarm, connection loss, escalation. |
| MENTAL-005 | `MISSING_SURFACE` / safety | breathing/meditation/history/contact reads not intervention/crisis workflow. | clinical content/safety pack and crisis handoff before surfacing claims. | urgent crisis, unsupported locale, clinician unavailable, explicit refusal/escalation. |
| CONTENT-006 | `STATIC_OR_SOURCE_PARTIAL` | articles/bookmarks exist but moderation/medical governance/public lifecycle not closed. | editorial review/source/review date/publish-revoke/moderation/reporting. | stale/withdrawn content, report abuse, locale mismatch, visibility changes. |

### 2.7 Money, insurance, wallet, loyalty and offers

| Gap ID | الحالة | baseline gap | remediation | scenarios |
|---|---|---|---|---|
| FIN-001 | `CONFIRMED_SOURCE_DEFECT` | raw/hardcoded card data and fake/local payment/return success paths in Mobile evidence. | PSP tokenization only, signed webhook, idempotency, immutable ledger. | webhook replay, duplicate attempt, partial capture, failure/retry. |
| FIN-002 | `MISSING_SURFACE` | Web payment success/failed/processing and wallet modules missing; no end-to-end financial state evidence. | truthful payment status/receipt/help; wallet only after ledger and policy. | pending/failed/refunded/reversed/stale-balance/dispute. |
| INS-003 | `CONFIRMED_SOURCE_DEFECT` / partial | fake policy/benefit/CHI scraping and no authoritative policy/coverage decision chain. | payer integration with consent/version/freshness/reason codes. | eligibility error, policy expiry, full/partial/reject/co-pay, patient alternative. |
| LOY-004 | `MISSING_SURFACE` | loyalty/reward/referral lacks financial policy/ledger/anti-abuse. | delayed after financial core. | earn/redeem/expire/reverse/fraud/transaction mismatch. |
| OFFER-005 | `MISSING_SURFACE` | commercial offers/coupons lack eligibility/publication/terms/reversal model. | promotion policy and audit, truthful price terms. | expired/invalid/stacking/withdrawal/refund reversal. |

### 2.8 Web parity, UX, accessibility, public content and advanced features

| Gap ID | الحالة | baseline gap | remediation |
|---|---|---|---|
| WEB-001 | `MISSING_SURFACE` | 189 Web surfaces missing relative to Mobile candidates; 53 partial. | use `NABD_SCREEN_ROUTE_SCENARIO_BUILD_MATRIX_2026-08-26.md`; build only when its journey contract is production-ready. |
| WEB-002 | `CONFIRMED_SOURCE_DEFECT` / partial | no parity proof; Mobile defects must not be copied. | parity manifest by CTA→contract/state, not route count; responsive/RTL/accessibility/run-time proof. |
| UX-003 | `CONTRACT_RUNTIME_REQUIRED` | loading/empty/error/offline/device/accessibility/RTL designs not globally verified. | screen manifest and UI state library; WCAG/RTL/browser/device QA. |
| SEO-004 | `CONTRACT_RUNTIME_REQUIRED` | public resolver/catalog/content indexing cannot be treated as ready without truthful publication lifecycle. | canonical/hreflang/robots/sitemap/schema matching visible verified data; no PHI. |
| ADV-005 | `MISSING_SURFACE` / safety | AI, voice, map, scanner, wearables, nutrition, maternity, community, advanced programs are incomplete/absent in Web or unsafe in source. | individual contract + safety/data/device/operations pack before exposure. |

### 2.9 Provider and Admin

| Gap ID | الحالة | baseline gap | required first step | implementation scope after audit |
|---|---|---|---|---|
| PROV-001 | `AUDIT_REQUIRED` | 45/45 source read does not reconcile routes, CTAs, backend, tenant, money or runtime. | full Provider CTA→contract→state→ops audit. | onboarding/KYC/license, staff roles, catalog/stock/slots, offers, delivery/visits/results, payer, payout/support/SLA. |
| PROV-002 | `CONTRACT_RUNTIME_REQUIRED` | provider acceptance/offer/insurance/result/payout actions not proven. | reconcile provider actions against shared state machines. | provider work queues, audit, notification, exception/resolution flows. |
| ADMIN-001 | `AUDIT_REQUIRED` | no independent complete Admin manual audit. | inventory every page/action/role/API and test access matrix. | governance, provider approval, finance/recon/refund, payer, privacy, clinical safety, support, moderation, analytics. |
| ADMIN-002 | `CONTRACT_RUNTIME_REQUIRED` | no proof admin controls are segregated/audited/operational. | security/finance/clinical ownership design and privileged action model. | SoD, MFA, reason/audit, queues/SLA/escalation/runbooks. |

## 3. Baseline implementation plan

The actions below are not generic phases: each output becomes a verified branch slice, with contract, implementation, tests, runtime evidence and branch comparison outcome.

| Order | Program slice | Fixes baseline gaps | Required deliverables | Exit gate |
|---|---|---|---|---|
| 0 | Evidence/decision closure | all `AUDIT_REQUIRED` and unresolved contracts. | Provider/Admin/Backend audits; unknown register; policy owners; architecture decisions. | no P0 unknown lacks owner/decision; unready feature blocked. |
| 1 | IAM + PHI + platform foundation | SHARED-IAM/AUTHZ/PHI/CONTRACT/DATA; ID/PROF/FAM/PRIV. | unified auth/session; role/tenant/delegation/consent/audit; typed contracts/events/data plan. | authz/privacy/runtime test pack and security approval. |
| 2 | Finance + insurance base | FIN/INS and relevant pharmacy/booking guards. | PSP adapter, webhook/replay, ledger, policy/recon, payer decision/co-pay contract. | sandbox/reconciliation/negative financial tests. |
| 3 | Pharmacy vertical slice | PHARM-001..007. | all patient/provider/admin/support screens and contracts from cart to refund. | live-like E2E with offer race, payer, payment, COD, fulfillment and reconciliation. |
| 4 | Unified booking vertical slice | BOOK/DIAG/HOME/CALL/CARE. | service/provider/slot/hold/quote/coverage/payment/confirmation/delivery/result lifecycle. | patient/provider/admin E2E, time/race/cancellation/call/result evidence. |
| 5 | Trusted patient workspace | HEALTH/content/notifications/support/settings and genuine Web parity. | profile/address/family/PHI/reports/reminders/notifications/support; screen/CTA manifest. | consent/provenance/accessibility/RTL/real-data audit. |
| 6 | Provider operational core | PROV gaps. | provider onboarding, roles, catalogs, work queues, fulfillment, clinical/insurance/finance/support. | tenant/role/SLA/ops acceptance and runtime tests. |
| 7 | Admin operational core | ADMIN gaps. | role-separated control planes, governance/finance/privacy/safety/support/moderation. | SoD/MFA/audit and operational drill. |
| 8 | Advanced/safety features | CLIN/EMERG/ADV/LOY/OFFER. | individual safety packs, content governance, device integrations, wallet/loyalty only after core. | clinical/finance/privacy/ops approval per feature. |
| 9 | Production proof and rollout | SHARED-OPS/UX/SEO. | performance/security/pentest/DR/SLO/pilot/release evidence. | written GO by Product/Security/Privacy/Clinical/Finance/Ops/SRE. |

## 4. Required evidence to close a gap

For every Gap ID, the closing branch must include:

1. **Source diff:** product/backend/data change with reviewer.
2. **Contract diff:** API/event, DTO/schema, state transition, error/negative behavior.
3. **Authorization:** owner/stranger/unauth/role/tenant/delegation tests.
4. **Authority evidence:** price/stock/provider/slot/payer/clinical result source and freshness.
5. **Financial/clinical evidence:** PSP/ledger/recon or safety/governance as applicable.
6. **Runtime evidence:** valid sandbox/dev device/browser/provider/admin execution, no production claims from mocks.
7. **Operations evidence:** notification/audit/log/metrics/alert/runbook where actor needs it.
8. **Regression evidence:** current baseline tests plus new scenario tests pass; no fake states introduced.
9. **Comparison result:** `CLOSED`, `PARTIALLY_CLOSED`, `NOT_CLOSED`, `REGRESSED`, or `UNRELATED` with source paths/lines.

## 5. Protocol when the new branch arrives

### 5.1 Baseline and comparison rule

The incoming branch is compared to **exactly** `main @ 22526bedb77a3d8148219036367e4714f401aecc` plus this baseline register. Audit artifacts are not treated as product repairs.

### 5.2 Intake material required

| Needed item | Why |
|---|---|
| Branch name and full commit SHA | fixes a reproducible comparison target. |
| Commit range from `main` | separates intended changes from inherited branch history. |
| Build/test commands and environment assumptions | permits repeatable verification later, not guesses. |
| Contract/API migration notes | maps mutations/data changes to baseline gaps. |
| Sandbox-only test identities/instructions, if runtime test is authorized | permits owner/stranger/replay testing without real data. |
| Known limitations/deferred work | prevents false closure and makes residual gaps explicit. |

### 5.3 Comparison workflow

1. Verify `git ls-remote` branch SHA and clean worktree; create read-only checkout.
2. Compute `main...incoming` diff and classify each changed file: product source, contract/API, schema/migration, test, config/infra, audit-only, or unrelated.
3. Map every changed CTA/route/controller/event to Gap IDs above; no mapping means `UNRELATED_OR_UNTRACED` until reviewed.
4. Inspect source and contracts manually; validate method/path/payload/status/authorization/state authority exactly.
5. Review tests for happy, negative, owner/stranger/unauth, concurrent/idempotent, financial/clinical and runtime evidence; mocks alone do not close P0 gaps.
6. Mark each Gap ID: `CLOSED_BY_SOURCE_AND_TEST`, `PARTIAL`, `STILL_OPEN`, `REGRESSED`, or `RUNTIME_REQUIRED`—with exact source paths/lines and test command/result.
7. Update the branch-delta ledger and revised remaining plan; only then choose the next remediation slice.

### 5.4 Rules that prevent false closure

- A new screen does not close a gap without backend state/authorization/authority.
- A new endpoint does not close a journey without patient/provider/admin/support/financial completion path.
- A green mock test does not close a real PSP/payer/call/device/authorization gap.
- A UI change that reproduces Mobile local/fake logic is a regression, not parity.
- A change must not be merged/deployed/tested against production data under this baseline process without explicit later authorization.

## 6. Current baseline decision

The correct state remains **NO-GO**. The next useful input is the exact new branch and commit range. Once supplied, its changes will be measured against this register—not assumed correct—and the plan will be reduced to the genuinely remaining gaps.

## References

[1]: `PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md`.

[2]: `PATIENT_WEB_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md`.

[3]: `NABD_SCREEN_ROUTE_SCENARIO_BUILD_MATRIX_2026-08-26.md`.

[4]: `NABD_FULL_PRODUCTION_TRANSFORMATION_BLUEPRINT_2026-08-26.md`.
