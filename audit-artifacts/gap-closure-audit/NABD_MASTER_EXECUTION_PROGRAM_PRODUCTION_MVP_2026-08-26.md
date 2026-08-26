# برنامج Nabd التنفيذي الرئيسي: تحويل المنصة إلى MVP إنتاجي ثم نسخة متقدمة

**الإصدار:** 2026-08-26

**الحالة:** خطة تنفيذية موسعة مبنية على الأدلة المتاحة؛ لا تمنح تصريح تشغيل أو ادعاء جاهزية قبل اجتياز بوابات القبول.

**النتيجة المستهدفة:** منصة رعاية صحية موثوقة، لا تُظهر بيانات أو نتائج مصطنعة، وتكمل رحلة كل actor بصورة آمنة وقابلة للتدقيق والتشغيل.

> هذه الوثيقة ليست قائمة واجهات. إنها برنامج بناء متكامل: **قرار المنتج → عقد وبيانات → Backend/Events → Provider/Admin operations → Mobile/Web UX → الاختبارات → observability → قبول وإطلاق**. لا تنتقل أي مرحلة إلى التالية لمجرد اكتمال الشاشات.

## 1. الحقيقة الحالية وما تعنيه

تمت مراجعة Patient Mobile وPatient Web يدويًا على مستوى المصدر عند `246/246` لكل منتج. هذا يثبت تغطية الجرد، لا صحة الإنتاج. ثبتت فجوات في الهوية، PHI والعائلة، الحجز، الصيدلية، التأمين، المال، الرحلات السريرية، AI والطوارئ والعديد من أسطح Web. كما أن Provider يحتاج reconciliation تشغيليًا وAdmin يحتاج تدقيقًا يدويًا كاملًا قبل أن تتحول متطلباته إلى backlog نهائي.[1] [2]

لذلك يُدار العمل بمستويين واضحين:

| المستوى | الوعد | نطاقه |
|---|---|---|
| **MVP إنتاجي آمن** | تشغيل خدمات محددة end-to-end ببيانات حقيقية وعقود واختبارات وتدخل بشري عند الفشل. | الهوية، الملف/العنوان، الاستشارة والحجز، الصيدلية بالعروض، الدفع/التأمين، Provider Ops، Admin Ops، الدعم والتشغيل. |
| **النسخة المتقدمة** | توسع في الخدمات والذكاء والأجهزة والولاء والمحتوى والنمو، بعد إثبات الأساس. | AI، wearables، wallet/loyalty، emergency automation، community، برامج صحية، SEO/geo growth، أسواق/مدن/مزودون إضافيون. |

لا تُطلق أي قدرة متقدمة لتغطية فراغ منتج أساسي. مثال: لا قيمة لـwallet أو loyalty أو AI إذا لم يكن ledger أو consent أو clinical safety أو دعم الحوادث قائمًا.

## 2. تعريف المنتج المستهدف

### 2.1 الـactors وسلطاتهم

| Actor | ما يفعله في الـMVP | ما لا يُسمح له بفعله بلا contract/role منفصل |
|---|---|---|
| Patient | إنشاء حساب/جلسة، إدارة ملف وعنوان، البحث، اختيار خدمة، حجز أو طلب، دفع أو تأمين، تتبع، دعم، إدارة consent. | رؤية بيانات شخص آخر، تأكيد بلا دفع/موافقة، تعديل أسعار/مخزون/slot، ادعاء نتيجة طبية. |
| Family delegate | صلاحيات محددة زمنيًا وخدميًا بعد موافقة المريض. | تفويض ذاتي أو وصول شامل/دائم أو تصدير PHI بلا scope/audit. |
| Provider organization | إدارة منشأة/فروع/طاقم وخدمات وslots وعروض/طلبات ونتائج ضمن tenant. | الوصول إلى أي patient أو pricing/payout خارج tenant، أو تجاوز payer/financial policy. |
| Provider staff | أداء action محدد حسب role: طبيب، صيدلي، ممرض، مشغّل، محاسب. | قبول/رفض/عرض/نتيجة أو تسوية بلا role/assignment/audit. |
| Payer/insurance operator | قرار تغطية وco-pay بأسباب وإصدار زمني. | تعديل حالة طلب أو ledger أو PHI خارج scope الموافقة. |
| Admin | تحكم policy/approvals/exceptions/moderation/support/audit حسب privilege مفصول. | استخدام حساب عام واسع الصلاحية أو إخفاء أثر العمليات. |
| Support/finance/clinical safety | أدوات محددة للحل، النزاع، escalation، reconciliation، incident. | الوصول الأوسع من الحاجة أو تعديل state بلا سبب/audit. |

### 2.2 الخدمة المتاحة في MVP

الـMVP لا يعني تقليل منطق الرحلات؛ بل تقليل عدد الخدمات مع **اكتمال منطقي**. يوصى بالإطلاق الأول مع الخدمات التي يمكن تشغيلها فعليًا مع مزودين معتمدين:

| المجموعة | MVP إلزامي | بعد الاستقرار |
|---|---|---|
| الاستشارات | online/in-clinic consultation، اختيار طبيب وslot، cash/card/insurance، call أو visit، result/post-care. | multi-participant calls، subscriptions، advanced triage. |
| الصيدلية | Rx/OTC cart، geo broadcast، offers، selection، payment/COD/insurance، tracking، issue/refund. | multi-order batching، dynamic routing، predictive substitutions. |
| التحاليل/الأشعة | catalog، provider/slot/home-visit where supported، prepayment/insurance، reports. | comparison intelligence، longitudinal insight. |
| رعاية/تمريض منزلي | service/address/slot/caregiver assignment، status tracking، completion evidence. | recurring care plans، smart dispatch. |
| health profile | profile, addresses, consent, allergies/conditions/medications read/verified fields. | device ingestion، coaching، automated scores. |

أي surface خارج هذا النطاق يُعرض **صادقًا** كـ`Not available yet` أو لا يُنشر، وليس mock أو fake flow.

## 3. الهيكل البرمجي والتنفيذي

### 3.1 streams مستقلة ومُلّاك واضحون

| Stream | المسؤولية | لا يعتمد على |
|---|---|---|
| Shared Backend/Data | domain model، contracts، state machines، authz، events، ledger، data quality. | افتراض واجهة موجودة كدليل للسلوك. |
| Patient Mobile | native UX، device capability، offline/retry، accessibility/RTL، contracts shared. | نسخ local-state أو fake outcomes. |
| Patient Web | responsive/SEO public surfaces، authenticated UX، BFF boundaries، contracts shared. | عدّ شاشات Mobile كـparity. |
| Provider | tenant ops، staff roles، availability, offers, fulfillment, clinical/action workflows. | navigation-only role gates. |
| Admin | policy، support، finance، audit، moderation، escalation. | dashboard-only visibility بلا action/audit. |
| Security/Privacy | threat model، IAM، consent، PHI policy، logging/security verification. | ادعاء frontend-only protection. |
| Clinical Safety | content policy، decision safety، emergency/AI escalation، clinical approvals. | disclaimer فقط. |
| Platform/SRE | environments، CI/CD، telemetry، resilience، runbooks، backup/restore. | build أخضر فقط. |
| Finance/Operations | PSP/payer reconciliation، COD/payout/refund policy، provider SLAs. | client success screen. |

### 3.2 definition of ready وdefinition of done

| شرط | Ready قبل بدء الشريحة | Done قبل إغلاقها |
|---|---|---|
| Product | actor، journey، success/failure/recovery، policy owner، out-of-scope مكتوبة. | UX content/accessibility/RTL reviewed وanalytics غير حساسة موجودة. |
| Contract | CTA → method/path/event/payload/statuses/DTO/state transition واضح. | controller/service/schema/OpenAPI مطابقة وversioned. |
| Data | source of truth، owner، freshness، retention، audit fields، migration plan. | integrity/authorization/backfill/rollback verified. |
| Security | threat/risk، authz، PII/PHI classification، abuse controls. | owner/stranger/unauth + security tests وreview. |
| Financial/clinical | decision authority، reconciliation/escalation policy. | sandbox/reconciliation أو clinical approval/adverse-path tests. |
| Operations | provider/admin/support action، notifications، SLA، incident owner. | runbook/dashboard/alerts and recovery tested. |

## 4. canonical domain model والعقود المشتركة

هذه ليست تفاصيل اختيارية؛ بدونها يصبح كل تطبيق مجموعة شاشات منفصلة.

### 4.1 الكيانات الأساسية

| Domain | الكيانات | invariants يجب فرضها |
|---|---|---|
| Identity | Account, PatientProfile, Session, Device, VerificationChallenge, ConsentReceipt. | unique identity rules، session rotation/revoke، no guest fallback after authenticated failure. |
| Access | Role, Permission, Tenant, StaffMembership, ResourceGrant, FamilyDelegation, AuditEvent. | actor/resource scope، expiry/revoke، tenant isolation، reason/correlation ID. |
| Catalog | Service, Specialty, Provider, Branch, Medicine, LabPackage, RadiologyService, PriceQuote. | authoritative version/freshness، locale content، publish/revoke lifecycle. |
| Scheduling | Availability, Slot, Hold, Booking, Appointment, Assignment, Cancellation, Reschedule. | atomic hold، timezone، no double booking، expiry، legal transitions only. |
| Pharmacy | Cart, CartLine, PrescriptionAttachment, PharmacyRequest, BroadcastAudience, Offer, OfferLine, Selection, Fulfillment. | quote/version/expiry، stock reservation، substitution consent، one selected offer. |
| Payer | Policy, EligibilityCheck, AuthorizationRequest, CoverageDecision, CoPay, ReasonCode. | decision source/version/time، patient consent، full/partial/reject/co-pay transitions. |
| Money | PaymentIntent, PaymentAttempt, PSPEvent, LedgerAccount, LedgerEntry, Receipt, Refund, Dispute, CODCollection. | immutable ledger، idempotency، webhook signature/replay protection، balanced entries. |
| Clinical | ClinicalDocument, Result, Report, Prescription, CarePlan, ClinicalReview, Escalation. | provenance/author/time/version, access scope, no unapproved automated assertion. |
| Communication | Notification, DeliveryAttempt, ChatThread, Attachment, CallRoom, CallToken, SupportCase. | participant authorization، retention، delivery/read state، abuse controls. |
| Operations | ProviderOfferAction, WorkQueue, Payout, Settlement, AdminCase, Incident. | assignment, SLA, audit, reversible/exception workflow. |

### 4.2 standard API/event contract

كل endpoint أو socket event يلتزم بالآتي:

```text
contract_id, actor_type, resource_type, ownership_rule,
request_schema, response_schema, error_schema,
idempotency_rule, optimistic_concurrency_rule,
state_from, state_to, authority_source,
notification_events, audit_event, retention_class,
owner/stranger/unauth expected response.
```

لا يُقبل `N/A` أو generic text. إذا لم توجد قدرة، تسجل `MISSING_CAPABILITY` مع evidence source/route scan وخطة قرار.

## 5. الرحلات الحرجة كـstate machines

### 5.1 الصيدلية

| State | actor/action | guard/authority | next states |
|---|---|---|---|
| `DRAFT_CART` | Patient add/edit line | medicine/Rx validation، no final price. | `READY_TO_SUBMIT` |
| `READY_TO_SUBMIT` | Patient submits | address/geofence/Rx policy; idempotency key. | `BROADCASTING` or `REJECTED_INPUT` |
| `BROADCASTING` | System finds eligible pharmacies | geo/tenant/operating hours/capability. | `OFFERS_OPEN` or `NO_OFFERS` |
| `OFFERS_OPEN` | Pharmacy offers exact/substitution availability | authoritative stock, quote, ETA, expiry. | remains open |
| `OFFER_SELECTED` | Patient selects one offer | active offer; atomic selection/reservation. | `AWAITING_PAYMENT` / `AWAITING_INSURANCE_DECISION` / `COD_CONFIRMED` |
| `AWAITING_INSURANCE_DECISION` | pharmacy/payer decide | policy/eligibility/authorization and reason codes. | `CO_PAY_DUE`, `COVERED_CONFIRMED`, `INSURANCE_REJECTED` |
| `AWAITING_PAYMENT`/`CO_PAY_DUE` | Patient pays card/cash policy | PSP intent/authorization or explicit COD policy. | `FULFILLMENT_ACCEPTED` / `PAYMENT_FAILED` |
| `FULFILLMENT_ACCEPTED` | Pharmacy accepts/prepares | selected offer + payment/coverage guard. | `PREPARING`, `CANCELLED_BY_PHARMACY` |
| `DISPATCHED` | pharmacy/logistics dispatch | delivery proof policy. | `DELIVERED`, `DELIVERY_ISSUE` |
| `DELIVERED` | completion | receipt/COD settlement. | `RETURN_ELIGIBLE` / terminal |

Required negative paths include unavailable item, offer expiry, duplicate submit, competitor race, invalid Rx, price change, payer reject, partial coverage, payment failure, pharmacy cancel, delivery issue, refund/dispute.

### 5.2 consultation/lab/radiology/home-care/nursing

| Sequence | Cash/card | Insurance |
|---|---|---|
| 1 | Select authoritative service/provider/slot. | Select authoritative service/provider/slot. |
| 2 | Create short-lived hold and server quote. | Create request/hold without payment. |
| 3 | Create payment intent; pay successfully. | Provider/payer decision with reason, coverage and co-pay. |
| 4 | Confirm booking only after payment state is authoritative. | Patient pays co-pay if required; then confirm. |
| 5 | Provider delivery/call/visit/result + support. | Same delivery only after confirmed coverage/payment state. |

No screen may call itself `confirmed` before the state machine reaches `CONFIRMED`.

### 5.3 identity, PHI and family

```text
identity verification → session issuance → resource authorization
→ explicit consent/delegation where required → audited read/mutation
→ revoke/logout/expiry/export/delete as policy dictates
```

Required decisions: account merge, minor/guardian policy, guest policy, social identity mapping, phone/email uniqueness, device trust, session/risk response, legal acceptance versioning and jurisdiction.

## 6. البرنامج المرحلي التفصيلي

### Phase A — Mobilization, evidence closure, and safety freeze

**Goal:** منع توسع غير صحيح وتحويل findings إلى work packages قابلة للتنفيذ.

| Work package | Detailed deliverables | Acceptance gate |
|---|---|---|
| A1. Product decision board | scope MVP, supported countries/services/providers, payment/COD/insurance policies, named owners. | Signed decisions; unsupported capabilities explicitly unpublished/blocked. |
| A2. Provider/Admin audit | route/CTA/scenario inventory, source evidence, backend reconciliation. | 100% inventory statuses; no assumed Admin/Provider backlog. |
| A3. Contract reconciliation | contract register per real CTA across all core journeys. | backend controller/service/DTO/authz/event/state line references or documented gap. |
| A4. Fake-state removal plan | map every mock/static/local-success/raw-card/placeholder to remove, replace, or block. | zero unapproved production-facing fake outcomes list. |
| A5. Architecture baseline | ADRs for multi-tenancy, auth, money, events, PHI, PSP/payer, files, realtime. | Architecture/security review accepted. |

### Phase B — Platform and data foundations

| Work package | Backend/Data build | Client impacts | Acceptance |
|---|---|---|---|
| B1. IAM | accounts/roles/tenant/session/device/authz policy. | real login/onboarding/session expiry/revoke. | authz matrix tests and security review. |
| B2. PHI governance | consent/audit/retention/export/delete/data classification. | privacy center, consent UI, family boundaries. | audit and revocation demonstrated. |
| B3. API/event platform | OpenAPI, validation, error envelope, idempotency, outbox, correlation IDs. | typed clients, retry classification, truthful errors. | contract tests + event replay tests. |
| B4. Core catalog | provider/service/medicine/catalog publication/pricing source. | discovery only reads truthful data. | source/freshness/publication/revoke proven. |
| B5. Platform operations | environments, CI, secret management, migrations, flags, backups. | safe releases/rollback. | restore drill and deployment simulation. |

### Phase C — Financial and payer core

| Work package | Detailed scope | Acceptance |
|---|---|---|
| C1. Payment provider | tokenized card flow, payment intents, capture/failure/retry, verified webhooks. | no raw-card storage/handling; replay and idempotency proven. |
| C2. Ledger/reconciliation | accounts, entries, balances, receipts, daily reconciliation, exceptions. | double-entry invariant and reconciliation report pass. |
| C3. COD | explicit collection ownership, settlement/failed collection/refund. | no false paid state before collection policy conditions. |
| C4. Insurance | eligibility, authorization, decision, co-pay, rejection reasons, patient alternative. | payer lifecycle tests with full/partial/reject/co-pay. |
| C5. Refund/dispute | eligibility, approval, PSP reversal/refund, ledger adjustments, notifications. | end-to-end refund/dispute recovery test. |

### Phase D — Pharmacy vertical slice

| Layer | Required work |
|---|---|
| Backend/Data | cart, Rx policy, geo broadcast, offer lifecycle, reservation, selection lock, payer/payment guards, fulfillment/tracking/returns. |
| Provider | pharmacy onboarding, branch/service-area, inventory feed, offer console, substitution consent, preparation/dispatch/completion. |
| Admin | pharmacy approval, catalog/policy exceptions, offer/order dispute, refund/settlement view and audit. |
| Patient Mobile/Web | catalog/search/detail, cart/Rx, address, offer comparison/selection, payment/insurance, tracking/support/refund. |
| QA/Ops | concurrent offers, stock race, price/ETA expiry, payment fail/webhook replay, provider outage, delivery issue, accessibility/RTL/offline. |

### Phase E — Unified booking vertical slice

| Layer | Required work |
|---|---|
| Backend/Data | availability, provider/slot authority, holds, quotes, payer/payment, booking lifecycle, cancellation/reschedule, notifications. |
| Provider | schedules, capacity, acceptance, payer decision, consultation/visit/call/result completion. |
| Admin | provider/service policy, exception queue, no-show/dispute, audit and SLA alerts. |
| Patient | discovery/filter/doctor/service detail, calendar, quote, insurance/payment, confirmation, reminder, cancel/reschedule, call/visit/result. |
| QA/Ops | double-booking/race/time-zone, slot expiry, payment failure, payer reject/co-pay, provider cancellation, result access/ownership. |

### Phase F — Patient trusted health workspace

| Work package | MVP implementation |
|---|---|
| Profile/address | real CRUD, validation, geocoding policy, default-address audit, delete/update behavior. |
| Insurance profile | policy/consent/status/read-only vs update boundaries, freshness and error states. |
| Family | invite/accept/decline, scoped delegation, expiry/revoke, audit and notification. |
| Health data | conditions, allergies, medications, prescriptions, vitals, reports only from authoritative data with provenance/time. |
| Notifications/support | notification preference controls where implemented, inbox action states, support case and PHI-safe attachments. |
| Access UX | sign-up/login/OTP/social only where fully contracted, recovery/2FA/logout/session/device control, no fake success. |

### Phase G — Clinical safety and advanced features

All advanced features remain disabled until each has a separate safety pack.

| Feature | Required preconditions | Launch condition |
|---|---|---|
| AI triage/assistant | allowed use case, sources, citations/grounding, red-team/eval, privacy controls, human escalation. | approved safety case and monitoring. |
| Emergency/SOS | jurisdiction/SOP, consent/location, responders, acknowledgement, failure/false-alarm, audit. | live operational drill. |
| Wearables | OS permission, data scope/freshness, consent/revoke, encrypted sync, quality/conflict handling. | device compatibility and privacy test matrix. |
| Mental health content | clinical owner, crisis protocol, locale/cultural review, no unsupported claims. | clinical signoff and crisis-path test. |
| Nutrition/maternity/programs | evidence owner, safe boundaries, referral/escalation, content versioning. | clinical approval and transparency UX. |
| Wallet/loyalty/referrals | ledger, policy, anti-abuse, taxation/accounting, reversal. | financial approval/reconciliation. |
| Community/reviews | moderation, abuse reporting, identity/publisher policy, privacy. | moderation operations readiness. |

### Phase H — Provider production platform

Provider starts only after its manual audit and shared contracts are complete.

| Capability group | Required screens/actions/controls |
|---|---|
| Organization onboarding | legal entity/KYC/license, branches, operating area, service capability, bank/payout verification, approval states. |
| Staff/IAM | invite, roles, credential/shift assignment, remove/revoke, branch/tenant boundary. |
| Catalog/availability | services, pricing policy inputs, stock, substitutions, slots/capacity, blackout windows. |
| Pharmacy operations | broadcast queue, offer composition, stock reservation, substitution, prepare/dispatch/proof/issue. |
| Clinical operations | appointments/visits/calls, patient eligibility, consent indicators, result/report authoring and signoff. |
| Insurance/finance | coverage decision workflow, co-pay, invoices/payout/settlement, disputes and audit. |
| Support/quality | SLA queues, incident flag, no-show, cancellation reason, patient communication within policy. |

### Phase I — Admin production platform

Admin must be role-segmented and audit-first, not a superuser dashboard.

| Domain | Required admin capability |
|---|---|
| Governance | organization/provider approval, license expiry, staff/role review, service/branch policy. |
| Operations | work queues, SLA breaches, provider assignment, cancellations/no-shows, escalation. |
| Finance | payment/ledger/reconciliation, COD, payouts, refunds/disputes, payer exceptions. |
| Security/privacy | access audit, session risk, consent/data requests, impersonation policy with reason and audit. |
| Clinical safety | content approval, incident/case handling, AI review/evaluation visibility, emergency escalation logs. |
| Trust & content | catalog publish/revoke, article/review/community moderation, public-link lifecycle. |
| Analytics | governed metrics with data lineage and aggregation; no PHI leakage. |

### Phase J — Experience, design and accessibility system

| Area | Required standard |
|---|---|
| Design language | premium but restraint-based vector icon system, documented tokens, semantic color, no emoji substitutes, reusable components. |
| Motion | purposeful transitions, skeleton/loading sequencing, `prefers-reduced-motion`, no motion blocking urgent actions. |
| RTL/i18n | Arabic-first layout audit, plural/date/number/currency correctness, locale-safe links/content. |
| Accessibility | WCAG AA targets, keyboard/focus/labels/errors, screen-reader validation, touch targets, contrast. |
| Truthful UX | loading/empty/error/blocked/offline/retry states reveal actual state; no fabricated counts, prices, benefits, booking/payment success. |
| SEO/public discovery | public catalog/article pages only after factual/published source; canonical/hreflang/sitemap/robots/schema match rendered UI; PHI never indexable. |

### Phase K — security, privacy, performance and resilience

| Domain | Mandatory controls |
|---|---|
| Application security | secure SDLC, dependency/SAST/DAST/secret/container scans, input/file upload validation, CSRF/CSP/SSRF defenses, rate limits, WAF policy. |
| Authorization | centralized policy enforcement, tenant/resource checks, audit event per sensitive action, break-glass governance. |
| Privacy | DPIA/threat model as applicable, encryption, minimization, redacted logs, retention, data subject workflows, vendor inventory. |
| Performance | budgets, indexes/query plans, caching/invalidation, pagination, queues/backpressure, image/media optimization, load/soak tests. |
| Resilience | multi-AZ/backup strategy as appropriate, restore drill, RPO/RTO, circuit breakers, degraded modes, incident drills. |
| Observability | traces/correlation, SLOs, error/crash monitoring, synthetic checks, dashboard/alerts/runbooks; no PHI in telemetry. |

### Phase L — validation and progressive launch

| Gate | Evidence required |
|---|---|
| Unit/component | coverage of business rules and UI states; no mocked production contract accepted as sufficient. |
| Contract/integration | generated OpenAPI/DTO checks, controller-service-schema alignment, event and idempotency behavior. |
| Authorization | owner/stranger/unauth/role/tenant/delegation tests for all resources/mutations/events. |
| Financial | PSP sandbox, webhook signature/replay, ledger/reconciliation, refund/COD/co-pay end-to-end tests. |
| Runtime E2E | real test accounts/devices/browsers/provider/admin actors; happy/negative/recovery/offline/race states. |
| Security | independent pen test and remediation of critical/high findings; security signoff. |
| Clinical/operations | safety owner approval, support/incident drills, provider/admin workflow acceptance. |
| Pilot | limited geography/providers/services, feature flags, observed SLOs and reconciliation period. |
| Expansion | post-pilot metrics stable; no open critical issue; written GO by Product/Security/Clinical/Finance/Ops. |

## 7. release policy: no mock, no placeholder, no false completion

A production release is rejected if any of the following exists:

1. A static, local, cached, or client-calculated value is displayed as an authoritative price, stock, insurance benefit, appointment confirmation, payment result, clinical result, delivery status, balance or ETA.
2. Payment success is rendered before verified payment state; raw payment card data is handled outside approved provider/tokenization boundary.
3. A user can read or mutate a resource without server-side owner/tenant/role/delegation enforcement.
4. A health/AI/emergency experience supplies unsupported clinical confidence or hides uncertainty/escalation limitations.
5. A screen only simulates a required provider/admin action, notification, error, refund, decision, or completion.
6. Tests pass only through mocks while critical contract/runtime/financial/authorization paths remain untested.

## 8. master backlog structure and prioritization

Every backlog item must be filed as a **contract slice**, not as a generic screen request.

| Field | Required value |
|---|---|
| Slice ID | stable ID e.g. `PHARM-OFFER-001`. |
| Journey/actor | exact patient/provider/admin action and entry state. |
| Contract | method/event, payload, response/error schema, idempotency, authz, state transitions. |
| Data | source, owner, freshness, retention, audit fields. |
| UX surfaces | Mobile, Web, Provider, Admin, notifications/support. |
| Risks | financial/clinical/privacy/security/operational. |
| Tests | unit, contract, authz, lifecycle, E2E, runtime, observability. |
| Exit evidence | artifacts/commit/test/runbook/approval required. |

Priority order is fixed unless an explicit incident changes it:

1. Security/identity/PHI/authorization and fake financial/clinical outcomes.
2. Financial core and pharmacy offers/selection/payment/insurance.
3. Unified bookings and provider delivery operations.
4. Provider/Admin audit then their core operational surfaces.
5. Patient trusted workspace and missing parity surfaces that are required by launched journeys.
6. Advanced health/AI/emergency/wearable/wallet/loyalty/community features only after safety and operational packs.
7. Growth, SEO/geo/aeo and premium motion only when public content and operational truth are ready.

## 9. final GO declaration template

A release is only declared production-ready after a signed evidence packet answers **yes** to every row:

| Question | Required answer/evidence |
|---|---|
| Is every launched journey end-to-end complete for patient, provider, admin and support? | Contract/state-machine/E2E evidence. |
| Are money, insurance, COD, payout, refund and ledger reconciled? | Finance evidence and reconciliation report. |
| Are PHI, family delegation, consent and access audited/revocable? | Security/privacy evidence. |
| Are clinical/AI/emergency claims controlled by approved protocols? | Clinical safety evidence. |
| Are Mobile/Web/Provider/Admin production workflows truthful and accessible? | Runtime/accessibility/RTL evidence. |
| Can the team detect, contain and recover from failures? | SLOs, alerts, runbooks, drills, restore evidence. |
| Is there zero unapproved fake/placeholder production state? | signed scan/review and release checklist. |

If any answer is no, the correct state is **NO-GO** or limited pilot—not a production-ready declaration.

## References

[1]: `PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — source-level Mobile audit closure and evidence limits.

[2]: `PATIENT_WEB_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — source-level Web audit closure and evidence limits.

[3]: `NABD_PRODUCTION_REMEDIATION_AND_LAUNCH_PLAN_2026-08-26.md` — earlier treatment/launch roadmap that this program expands.
