# مخطط التحول الإنتاجي الكامل لمنصة Nabd

**الإصدار:** 2026-08-26

**الغاية:** تحويل Nabd إلى منصة متاحة للمستخدمين الحقيقيين، مكتملة وظيفيًا وتشغيليًا وأمنيًا وماليًا وسريريًا بقدر نطاق خدماتها، من دون بيانات وهمية أو نجاحات مصطنعة أو رحلات ناقصة.

**الحكم الحالي:** `NO-GO` حتى تمر جميع الأدلة وبوابات القبول المذكورة هنا.

**طبيعة الوثيقة:** برنامج تحول إنتاجي كامل؛ لا يختزل المشروع في MVP محدود، ولا يدّعي أن التدقيق المصدرِي الحالي أغلق backend/runtime/Provider/Admin قبل فحصها.

> **قاعدة الصدق:** لا توجد وثيقة يمكن أن تثبت «لا توجد أي أخطاء من أي نوع» قبل التنفيذ والاختبار والتشغيل. لذلك هذا المخطط لا يخفي المجهول؛ بل يبني آلية إجبارية لاكتشافه، وتسجيله، ومعالجته، وإثبات إغلاقه قبل الـGO. لا يجوز استبدال هذه البوابات بعدد الشاشات، أو build أخضر، أو mock tests، أو demo ناجح.

---

## 1. معيار «الإنتاج الكامل» الذي يجب تحقيقه

لا تكون Nabd جاهزة للنشر العام عندما تبدو الواجهات جيدة؛ بل عندما يثبت أن كل قدرة منشورة تحقق ست طبقات اكتمال معًا.

| طبقة الاكتمال | السؤال الإلزامي | دليل الإغلاق |
|---|---|---|
| Product | هل نعرف actor، الهدف، القواعد، وجميع happy/negative/recovery states؟ | PRD/story map/state diagram مع owner وقرار policy. |
| Contract/Data | هل نعرف source-of-truth، API/event، schema، state transition، retention؟ | contract pack وmigration/data lineage وOpenAPI/DTO. |
| Security/Privacy | هل يُنفذ access/consent/tenant/PHI policy على الخادم؟ | threat model + authz tests + audit evidence. |
| Operations | هل يستطيع provider/admin/support/finance تشغيل الاستثناءات وحل الفشل؟ | queues, runbooks, SLA, audit, alerting, role tests. |
| Experience | هل توجد شاشة/CTA/رسالة مناسبة لكل state على Mobile وWeb عند نشرها؟ | UX/accessibility/RTL/device/browser test evidence. |
| Runtime | هل صمدت القدرة أمام concurrency/network/provider/PSP/payer failure؟ | E2E, load, resilience, financial/clinical/security tests. |

أي قدرة تفشل في طبقة واحدة تُصنف `BLOCKED` ولا تُنشر للجمهور. إذا كان لها UI قائم، تعرض blocked/unavailable state صادقة أو تُحجب بالـfeature flag.

---

## 2. خط الأساس، المجهول، والنطاق الملزم

### 2.1 ما ثبت وما لم يثبت

| النظام | حالة الأدلة | أثرها في الخطة |
|---|---|---|
| Patient Mobile | مراجعة source يدوية 246/246؛ عيوب/مسارات محلية/جزئية وفجوات رحلة موثقة. | لا ينسخ إلى Web؛ يعاد بناؤه على contracts صحيحة. |
| Patient Web | مراجعة source/CTA يدوية 246/246؛ 189 قدرة مفقودة و53 تطابقًا جزئيًا وعيوب موثقة. | لا يُعلن parity أو readiness؛ يعاد تنظيمه وفق service journeys. |
| Provider | قراءة مصدر سابقة 45/45 لكنها غير reconciled. | يبدأ بتدقيق route/CTA/scenario وruntime/backend reconciliation قبل backlog نهائي. |
| Admin | لم يُغلق تدقيق يدوي مستقل. | لا تُفترض screen list أو controls؛ تدقيق شامل إلزامي قبل التنفيذ. |
| Backend/Data | لم يثبت end-to-end مع كل CTA/event/role/payment/payer. | contract reconciliation وdata audit إلزاميان قبل كل mutation. |
| PSP/Payer/Logistics/LiveKit/OS | integrations حقيقية أو متوقعة، لكن سلوكها الحي غير مثبت في هذه الموجة. | sandbox/live certification وfailure-mode testing إلزاميان. |

### 2.2 سجل المجهول الإلزامي

لا تترك الخطة كلمة "لاحقًا". كل مجهول يدخل سجلًا موحدًا بهذه الحقول:

```text
unknown_id | domain | surface/CTA | evidence gap | business owner | technical owner |
required investigation | deadline | decision | implementation slice | test evidence |
release gate | status | audit trail
```

يُمنع إغلاق أي unknown بـ"متوقع" أو "غالبًا". إما دليل، أو قرار policy، أو `BLOCKED` لا يُنشر.

### 2.3 مصادر الحقيقة المشتركة

| نوع الحقيقة | المالك النهائي | ممنوع على العميل |
|---|---|---|
| الهوية/الأدوار/التفويض | Backend IAM + Security | اعتبار route guard أو navigation-only role check حماية. |
| السعر والخصم والضريبة والـETA | Catalog/Quote service + Provider/Finance policy | حساب/تثبيت price أو ETA من static/mobile state. |
| المخزون والبديل | Provider pharmacy stock authority | تأكيد توافر أو substitution بلا offer موقّع/نسخة quote. |
| slot/availability | Scheduling service + Provider capacity | تأكيد slot بعد اختيار client فقط. |
| التغطية/الموافقة/co-pay | Payer/Provider authority | عرض benefit أو claim scraping كقرار نهائي. |
| الدفع والرصيد والـrefund | PSP + immutable ledger | success page أو cached balance كحقيقة مالية. |
| النتيجة الطبية/الوصفة | authorized clinical source + signature/provenance | claims أو AI output أو data mock كوثيقة سريرية. |
| consent/family scope | consent/delegation service + audit | local toggle أو QR/share كصلاحية دائمة. |

---

## 3. النطاق الكامل لكل actor

### 3.1 Patient Mobile وPatient Web

المنتجان يشتركان في **الوظيفة والعقد والحالة**، لا في layout أو عيوب المصدر. لكل journey منشورة يوجد manifest يفصل route/screen/CTA/state/accessibility/error/loading/offline/contract، ويمنع إطلاق صف بلا دليل.

| Product area | شاشة/حالات ومهام يجب أن توجد أو تُحجب صراحة | Contract/operational dependency |
|---|---|---|
| First-run & onboarding | splash truthful state، locale، accessibility/language, legal/consent, sign up/sign in/social فقط إن كان contracted، recovery/2FA/guest policy. | IAM, consent, legal versioning, rate limits, abuse monitoring. |
| Account & devices | profile، contact verification، password/OTP/2FA، sessions/devices، logout/revoke، close/export/delete account. | session/device lifecycle, identity verification, audit, retention. |
| Addresses/location | add/edit/delete/default، geocoding, serviceability, privacy/location consent, failure/unsupported address. | address validation, service zones, data minimization. |
| Family/delegation | invite/accept/decline، role/scope/time limit، revoke، activity/audit، guardian policy. | delegation engine, consent receipts, authz. |
| Home/dashboard | real upcoming booking/order/tasks/alerts; no fabricated cards or static health promises. | aggregated read models, freshness, personalized access controls. |
| Search/discovery | service/provider/medicine/content search, filters, sort, empty/no-network/unavailable, search privacy. | catalog/index, authorization, ranking policy, analytics privacy. |
| Catalog/details | doctor, service, medicine, lab/radiology package, provider/brach, price disclosure, availability, policy notices. | publication/freshness/source-of-truth, quote only when transactional. |
| Pharmacy | cart, Rx capture/upload/status, address/serviceability, offers, offer detail, substitution consent, selection, payment/insurance/COD, tracking, support, return/refund. | pharmacy state machine, offers, payments, payer, logistics, provider ops. |
| Appointments | service/provider/slot, quote, payment/insurance, confirm, calendar/reminder, cancel/reschedule, call/visit, result/post-care/support. | scheduling, payment/payer, provider, call, notification. |
| Diagnostics | catalog/package, home visit eligibility, booking, preparation, collection/visit state, report access/download/share policy, support. | diagnostic provider workflow, reports/provenance, payer/payment. |
| Home-care/nursing | service/address/assessment/slot/caregiver, pre-visit, arrival/visit progress, completion, issue/report. | assignment, route/service area, proof, clinical/provider workflow. |
| Insurance | policy data, freshness, eligibility, decision/co-pay/reason, claim/refund status only when fully integrated. | payer contract, consent, financial ledger. |
| Payments & finance | payment method/token, intent/status/receipt, invoice, refunds/disputes; wallet/loyalty only after financial core. | PSP, ledger, reconciliation, policy/risk. |
| Health workspace | verified profile/conditions/allergies/medications/vitals/prescriptions/reports; edit boundary and provenance. | PHI access, clinical data contracts, consent/audit. |
| Notifications/chat/support | preferences where implemented, inbox with actionable/deep-link states, secure attachments, support ticket, escalation. | delivery provider, thread authz, retention, support operations. |
| Content/community/reviews | published medical content, factual sources/author/review date, moderation/reporting, public page lifecycle. | editorial/moderation workflow, legal/clinical owner, SEO policy. |
| AI/emergency/wearables | **not exposed** until their individual safety/operational packs close. | clinical safety, OS/integration test, consent, incident operations. |

### 3.2 Provider application

لا تكفي شاشة "طلبات" أو "dashboard". يجب بناء سير عمل كامل لكل نوع مزود.

| Provider domain | Required capabilities | Mandatory controls |
|---|---|---|
| Organization verification | legal entity, branch, license/certification, service zones, contract status, bank/payout verification. | review/expiry/revoke, admin approval, audit. |
| Staff & roles | invite, approval, role templates, branch/team assignment, shifts, credential expiry, remove/revoke. | least privilege, tenant isolation, audit, no shared accounts. |
| Service/catalog | services, prices inputs, tax/policy, capacity, published status, photos/content controlled. | admin policy, versioning, source/freshness, publish/revoke. |
| Scheduling | availability, slots, holds, blackout, appointment queue, accept/reject/reschedule, no-show. | authoritative capacity, anti-overbooking, time zone, SLA. |
| Pharmacy operations | receive broadcast, verify Rx, reserve stock, build offer, substitutions, ETA, accept/select guard, preparation, dispatch/complete/issue. | stock authority, price version, audit, payment/coverage guard. |
| Insurance workflow | request review, full/partial/reject/co-pay reason, evidence, deadline/escalation. | payer policy, no manual bypass, patient notification/audit. |
| Clinical delivery | consultation/call/visit, patient identity/context policy, notes/results/signature, follow-up/referral. | clinical authorization, provenance, retention, incident handling. |
| Home-care/nursing | assignment, travel/service zone, arrival/visit proof, task/checklist, completion/escalation. | patient/privacy safety, time/location policy, supervisor queue. |
| Financial settlement | orders/appointments ledger view, payout statement, adjustment/dispute, invoices. | finance-only privileges, reconciliation and immutable evidence. |
| Provider support/quality | SLA queues, incidents, cancellations, complaints, scorecard, support communication. | reason codes, audit, moderation/clinical escalation. |

### 3.3 Admin platform

Admin is a regulated operational control plane, not a visually rich dashboard.

| Admin domain | Required operation | Guardrails |
|---|---|---|
| IAM/governance | admin role hierarchy, access review, break-glass, privileged session handling. | least privilege/MFA/audit/approval; no omnipotent default account. |
| Provider governance | approve/suspend/revoke organization/branch/staff/licenses/services/zones. | reason, evidence, expiry, notification, appeal/audit. |
| Catalog/commercial | service/medicine/content review, policy controls, price/quote rules, promotions only with finance governance. | versioned approval, source owner, rollback, no arbitrary patient price mutation. |
| Operations command center | queues for booking/order/offer/visit/call/diagnostic exceptions, SLA breach and reassignment. | actor/action/reason/time audit and patient/provider notification. |
| Finance command center | PSP events, ledger/recon, COD/payout, refund/dispute, payer exceptions. | segregation of duties, dual-control threshold, export limits, immutable trail. |
| Safety/privacy | consent/data request, PHI incident, emergency/AI/content escalation, moderation, fraud/abuse. | restricted visibility, case management, retention, escalation owner. |
| Support | omnichannel cases, PHI-safe attachments, identity verification, resolution taxonomy, QA. | no invisible data exposure; audit responses. |
| Analytics | service/operational/funnel/SLO reporting with lineage, safe aggregation. | privacy review, metric owner, no PHI in free-text dashboards. |

### 3.4 Shared Backend/Data/Platform

| Layer | Complete-production scope |
|---|---|
| Domain services | IAM, delegation/consent, catalog, scheduling, pharmacy/offers, payer, payment/ledger, clinical documents, communication, operations. |
| Persistence | schema ownership, FK/referential integrity where applicable, indexes, migrations, backfill/rollback, encryption, lifecycle/retention. |
| Eventing | outbox, ordered/idempotent consumers, retries/DLQ, schema registry, event audit, replay policy. |
| API gateway/BFF | schema validation, authz, rate limits, idempotency, error envelope, pagination/filter policy, version/deprecation. |
| File/media | virus scan, content-type/size limits, signed URLs, PHI classification, lifecycle/deletion, access audit. |
| Realtime | authenticated subscriptions, per-resource authorization, reconnect/resume, event ordering/duplication, abuse limits. |
| Integrations | PSP, payer, SMS/email/push, maps/geocoding, LiveKit/call, logistics only through adapter/contracts/circuit breakers. |
| Platform | environments, secrets/KMS, CI/CD, feature flags/kill switches, backups/restore, infrastructure-as-code, monitoring. |

---

## 4. service-by-service production contracts

### 4.1 Pharmacy: exact production journey

```text
Catalog / Medicine detail
  → authenticated cart (Rx when required)
  → address + serviceability + submit with idempotency key
  → auditable geo broadcast to eligible pharmacies
  → offer lifecycle: line availability/substitution/quote/fees/tax/ETA/expiry
  → patient compares and selects exactly one offer atomically
  → cash/card or explicit COD-collection-deferred policy
  → insurance decision full/partial/reject/co-pay, with patient choice
  → pharmacy acceptance/preparation/dispatch/delivery
  → receipt, support, return/refund/dispute/reconciliation
```

| Mandatory condition | Proof required |
|---|---|
| No quoted final amount before authoritative offer | quote version, expiry, server response, display provenance. |
| No offer selection race | transaction/lock, test with concurrent offers/selections. |
| No fulfillment before payment/coverage guard | server transition test and provider UI disable/rejection path. |
| No substitution without consent policy | patient consent tied to line/version and audit. |
| No cash/COD ambiguity | policy-specific state, collection event and finance reconciliation. |
| No insurance claim as local toggle | payer/provider decision state with reason and timestamps. |
| No refund as success screen only | PSP/ledger/order/inventory transition all reconciled. |

### 4.2 Consultation

```text
Specialty/search → doctor profile → real availability → select slot → hold/quote
→ payment (cash/card) OR insurance request (no payment)
→ insurance decision / co-pay where relevant → confirm
→ reminder → video/clinic visit → provider completion/notes/result/follow-up
→ cancellation/reschedule/no-show/support/refund rules
```

Required pages/actions include doctor discovery, filters grounded in authoritative data, profile/license/branch where policy allows, real slots, price disclosure, insurance decision, call waiting/permission/device failure, post-consultation documents, ratings only after verifiable completion and moderation policy.

### 4.3 Labs and radiology

```text
Catalog/package/detail → service location/home eligibility → provider/slot/hold
→ payment/insurance → booking confirmed → preparation/reminders
→ collection/scan status → signed report → patient access/download/share policy → support
```

A `reportReady` badge is not a result system. Result data requires signer/provenance/time, authorization, corrections/amendments, notification, and privacy-controlled export/share.

### 4.4 Home-care and nursing

```text
Service + assessment/address → eligible provider/caregiver + slot → quote/coverage/payment
→ confirmed assignment → pre-visit instructions → arrival/visit/task state
→ completion/proof/report → follow-up/issue/refund or escalation
```

Home location, caregiver identity, late/no-show, safety escalation, scope change, consent and proof-of-service require explicit policies and operational playbooks.

### 4.5 Financial/insurance lifecycle

| Event | Required authority | Required artifacts |
|---|---|---|
| Payment intent | server/PSP | idempotency key, amount/currency/merchant/order binding. |
| Payment completion | verified PSP webhook/reconciliation | signature validation, replay defense, ledger entries, receipt. |
| Insurance request | authorized patient/provider/payer path | consent, policy version, requested service/quote. |
| Coverage decision | payer/provider authority | full/partial/reject/co-pay, reason, expiry, audit. |
| Refund/return | policy + finance approval as needed | eligibility, reversal/refund, inventory/order/ledger adjustment. |
| Payout | finance/provider settlement | reconciled ledger, statement, dispute window, approvals. |

---

## 5. full engineering and data plan

### 5.1 Architecture decisions that must be explicit

1. **Multi-tenancy:** provider organization/branch/staff boundaries, row-level/document-level authorization, tenancy in every event and query.
2. **Authorization:** central policy engine or well-defined guards; no scattered UI decisions; test vector per endpoint/event.
3. **Idempotency and concurrency:** required for every mutation, PSP request, broadcast, offer selection, booking hold, cancellation, refund, and webhook consumer.
4. **Ledger:** immutable double-entry or equivalently provable accounting model; pending versus available; reconciliation and adjustment policy.
5. **Event delivery:** transactional outbox, idempotent consumers, retry/DLQ, schema versioning, tracing.
6. **PII/PHI:** data-class map, encryption keys, field-level visibility, redaction, retention/deletion, authorized export.
7. **Audit:** append-only security/financial/clinical/operations events with actor, target, action, reason, time, correlation ID and policy context.
8. **Files/media:** encrypted/signed access, anti-malware, content validation, PHI lifecycle, virus scan and processing status.
9. **Search:** access-filtered indexed content, no accidental PHI search; reindex/revoke path.
10. **Feature configuration:** remotely controlled flags/kill switches with tenant/user/service scope, expiry, audit and safe defaults.

### 5.2 Data-quality and migration program

| Work | Required execution |
|---|---|
| Data inventory | enumerate collections/tables/files/caches/logs/integrations, owner and classification. |
| Quality rules | completeness/uniqueness/range/freshness/referential integrity per domain. |
| Canonical IDs | define patient/provider/branch/service/booking/order/payment/report IDs; map legacy identifiers and duplicates. |
| Migration | dry run, checksums/counts, backup, rollback, data validation, reconciliation report, post-migration monitoring. |
| Seed/test data | isolated environments, clearly marked, non-production data, no accidental export/import to production. |
| Retention | policy per PHI/financial/audit/media data, legal hold and deletion workflow. |
| Backups | encrypted backup, restore tests, RPO/RTO objectives, access review. |

### 5.3 API quality requirements

Every contract declares:

```text
Version | method/path/event | actor/role | resource ownership rule | request/response/error schemas
idempotency | concurrency | pagination/filter/sort | state machine edge | event emissions
source of truth | PHI class | audit event | notification behavior | deprecation policy
```

The CI pipeline rejects endpoint changes that lack schema updates, authorization tests, and OpenAPI/contract tests.

---

## 6. security, privacy, clinical safety and compliance workstreams

### 6.1 Security program

| Control area | Required implementation and evidence |
|---|---|
| Secure SDLC | code review, protected branches, signed/reviewed dependencies, SAST, secrets scanning, dependency/license/container scanning. |
| IAM | MFA for privileged roles, password/OTP recovery hardening, session/device revoke, rate limits, brute-force/credential stuffing controls. |
| App/API | input/schema validation, SSRF/CSRF/CORS/CSP/clickjacking protections, file upload security, API quotas, WAF/DDoS posture. |
| Infrastructure | least privilege cloud/IaC, network segmentation, secrets KMS, patching, host/container hardening, vulnerability SLA. |
| Monitoring | suspicious-auth/activity alerts, immutable audit, incident playbooks, security event correlation. |
| Verification | threat models, abuse cases, independent pen test, remediation retest, red-team for high-risk surfaces. |

### 6.2 Privacy and PHI program

| Requirement | Production evidence |
|---|---|
| Purpose limitation | each PHI access/mutation maps to service purpose/role/consent or legal basis. |
| Minimum necessary | field-level response filters, role-based UI and logs, safe support views. |
| Consent | version/date/language/purpose, explicit accept/revoke, downstream enforcement and audit. |
| Delegation | scoped family/guardian access with expiry, accept, revocation, visibility and notifications. |
| Rights | export/access/correct/delete workflows consistent with policy and retention constraints. |
| Vendors | PSP/SMS/push/call/maps/analytics inventory, data-flow review, contractual/privacy approval. |
| Incident | breach triage, containment, evidence, communication and remediation runbook. |

Legal and regulatory decisions must be made by qualified local counsel and clinical/privacy owners for each launch jurisdiction; this plan creates the workstream and evidence requirements but does not substitute legal advice.

### 6.3 Clinical safety program

| Domain | Required safety control |
|---|---|
| Clinical documents/results | source, author, signature, timestamp, version/correction, patient authorization, escalation. |
| Content | medical owner, editorial review, sources, publish/revoke, locale/version history, adverse-content reporting. |
| AI | approved use limits, retrieval/source governance, evaluation/red-team, confidence/uncertainty UX, refusal, human handoff, monitoring. |
| Emergency | country-specific SOP, eligibility, consent/location, responder/integration, acknowledgement/failure, false-alarm, incident drill. |
| Mental health | crisis content/handoff, clinical oversight, no unsupported diagnosis/treatment claims, vulnerable-user safeguards. |
| Medication | authoritative drug source/freshness, Rx validation, pharmacist review, interaction/contraindication policy and safe messaging. |

---

## 7. customer experience, design, accessibility and content completeness

### 7.1 route/screen/CTA completion manifest

For every released Mobile, Web, Provider and Admin screen, create and maintain a manifest row:

| Field | Required content |
|---|---|
| Product/surface/route | exact route/native screen/version. |
| Actor and entry conditions | auth/role/tenant/consent/feature flag/state. |
| UI states | initial/loading/skeleton/empty/data/error/offline/permission denied/expired/blocked. |
| Every CTA | label, enabled guard, navigation, API/event, success/failure/retry/cancel behavior. |
| Data | source, freshness, transformations, missing field behavior. |
| Accessibility | semantic role, focus order, label, keyboard/touch/reader, contrast. |
| RTL/i18n | strings/plurals/dates/currency/layout direction/locale route. |
| Analytics | non-sensitive event and consent/retention policy. |
| Evidence | test IDs, contract slice, automated/manual test, screenshot/runtime proof. |

A route cannot be marked complete merely because it renders; every CTA and logical missing state must close.

### 7.2 design system implementation plan

1. Establish tokens for typography, color, spacing, elevation, radius, iconography, motion, semantic states and dark/high-contrast rules where needed.
2. Use a premium vector icon library or bespoke approved vectors; ban emoji as product icons and ban generic AI-placeholder graphics.
3. Define component library: button, icon button, input, OTP, select, date/slot picker, card, price/quote, state panel, alert, modal, bottom sheet, stepper, timeline, receipt, data table, empty/error/retry, skeleton, consent control.
4. Implement motion system: route entrance, list/item staggering, skeleton transition, loading indicators, success only on verified state, error/retry, reduced-motion alternative.
5. Audit responsive Web breakpoints and native devices, RTL, keyboard navigation, screen reader and touch targets.
6. Create design QA baseline screenshots only after journeys are contract-complete; visual parity never overrules correctness/privacy.

### 7.3 public web, SEO, GEO and content

| Area | Required production policy |
|---|---|
| Indexability | only approved public pages indexed; patient/provider/admin/PHI/personalized states protected/noindex. |
| Canonical/locale | canonical/hreflang/sitemap/robots reflect actual published content and correct locale. |
| Structured data | only UI-visible, factually correct `Organization`, `MedicalOrganization`, `Product/Offer`, `BreadcrumbList`, `ItemList` where applicable; no invented claims/ratings/prices. |
| Content lifecycle | draft → clinical/editorial review → publish → update → unpublish/410 where needed; author/review date/source. |
| Local pages | location/provider/service pages generated only from verified active data with serviceability/availability disclosure. |
| AI discovery | truthful content/source provenance, no hidden generated medical claims, monitoring of citations/incorrect representation. |

---

## 8. test strategy: proof, not optimism

### 8.1 test pyramid and environments

| Level | Required scope | Prohibited shortcut |
|---|---|---|
| Unit | domain rules, validators, calculations, UI state reducers. | treating unit mocks as production evidence. |
| Contract | OpenAPI/DTO, provider/consumer compatibility, error/status schema. | changing method/path without live/sandbox verification. |
| Integration | DB/events/outbox/authorization/PSP/payer adapters. | skipping retries, replays, concurrency and migration behavior. |
| E2E | patient/provider/admin/support actors with sandbox/test identities. | testing only happy path or shared superuser. |
| Runtime | real devices/OS/browsers/network interruption/camera/location/push where used. | claiming capability from source reading. |
| Load/resilience | quota/rate limit, queues, cache, DB, provider outage, payment/payer timeout. | benchmark against local single-user only. |
| Security/privacy | authz matrix, penetration, data leakage/logging/export/delegation scenarios. | checking visual route guards only. |
| Financial/clinical | reconciliation/receipt/refund/co-pay and adverse/safety/escalation scenarios. | simulated success without source authority. |

### 8.2 mandatory test matrix per mutation

```text
owner success | stranger denied | unauth denied | invalid input | expired state
concurrent request | duplicate/idempotent replay | dependency timeout/failure
state-transition rejection | audit emission | notification outcome
rollback/recovery | data retention/redaction effect
```

### 8.3 release evidence package

Each release carries:

- linked contract slices and change log;
- test reports by layer, environment and actor;
- security scan/pentest status and accepted residual risks;
- migration/backup/rollback evidence;
- feature flag/kill-switch plan;
- dashboards/alerts/runbooks;
- finance/clinical/privacy owner approvals as applicable;
- known-issue list with severity, owner, mitigation and release decision.

---

## 9. reliability, performance, operations and support

### 9.1 SLO/SLA framework

| Service class | Example SLO | Operational requirements |
|---|---|---|
| Identity/checkout/booking mutation | availability, latency, error rate and correctness budget agreed before launch. | synthetic checks, alerting, rollback, incident owner. |
| Payment/payer | correctness/reconciliation dominates raw latency. | webhook queues, daily reconciliation, exception queue, finance on-call. |
| Pharmacy/provider operations | offer/acceptance/dispatch SLA. | queue ages, provider escalation, fallback/no-offer workflow. |
| Clinical result/call | access/call join/error and safety escalation metrics. | provider support, audit, privacy/call incident process. |
| Notifications | delivery/failed/retry/read metrics without PHI logs. | provider fallback policy and user preference handling. |

Exact numeric targets are adopted by Product/SRE/Operations after capacity modelling and pilot data; they must not be invented in a planning document.

### 9.2 incident and support operations

Required playbooks: account compromise, PHI access incident, payment duplicate/failure, payer discrepancy, no pharmacy offer, wrong stock/substitution, booking double/late/cancel, provider no-show, call failure, report correction, emergency escalation failure, content/AI safety event, outage/data restore, abuse/fraud.

Each playbook lists detection, severity, owner, containment, customer communication, audit preservation, reconciliation, root-cause review and preventive change.

### 9.3 capacity and disaster recovery

- Capacity model per API/event/queue/database/file/call provider based on forecast and peak factors.
- Performance budgets for patient critical paths; cache only data with explicit invalidation/freshness.
- Backup encryption, RPO/RTO, restore drills, regional failure assumptions, queue/DLQ replay procedure.
- Zero-downtime or planned maintenance policy for migrations; rollback verified before rollout.
- Cost and vendor lock-in monitoring for PSP, messages, maps, video, storage and observability.

---

## 10. implementation sequence and dependencies

The following order is mandatory because later features depend on earlier truth/controls.

| Program wave | Cannot start until | Delivers | Cannot be called done until |
|---|---|---|---|
| 0. Audit + decision closure | current evidence review | Provider/Admin/Backend reconciliation, scope/policy board, unknown register. | every unknown has owner/decision/block. |
| 1. Platform/IAM/PHI | architecture decisions | authz, sessions, consent, audit, API/event/data foundations. | security/privacy gates and real authz tests. |
| 2. Money/payer | platform foundation | PSP, ledger, COD, insurance/co-pay/refund. | sandbox, webhook/recon and finance acceptance. |
| 3. Pharmacy | money/payer + provider ops | full offer-to-fulfillment journey across all products. | negative/race/financial/provider E2E evidence. |
| 4. Unified booking | IAM/money/payer + provider ops | consultation/lab/radiology/home-care/nursing lifecycle. | scheduling/payment/coverage/clinical/provider E2E evidence. |
| 5. Patient health workspace | IAM/PHI | profile/family/health documents/support/notifications. | consent/delegation/provenance runtime evidence. |
| 6. Provider/Admin core | audits + shared contracts | operational, finance, safety, support control planes. | role/tenant/audit/queue/SLA evidence. |
| 7. Advanced clinical/growth | core operations + safety packs | AI, emergency, wearables, wallet/loyalty, community, public content growth. | individual safety/finance/operations launch pack. |
| 8. General availability | all prior gates/pilot | public service expansion. | formal cross-functional GO evidence. |

Parallelism is allowed only where contracts/dependencies do not overlap; all client work remains blocked from creating a mutation before the server/domain contract exists.

---

## 11. launch plan from internal build to public availability

### Stage 1 — Engineering verification

- isolated non-production data and official sandbox identities;
- contracts, migrations, authorization and financial state machine verified;
- no production customer or real card testing outside approved process;
- release candidate has feature flags and rollback.

### Stage 2 — Operational beta

- limited providers, branches, services, geography and staff;
- controlled internal/pilot patient users under approved policy;
- reconciliation run daily; provider/admin/support queues staffed;
- live incident drills and response metrics; critical/major failures halt expansion.

### Stage 3 — Limited public release

- public enrollment only where legal, support, provider capacity and payment/payer readiness are proven;
- monitor conversion, failure, offer response, booking confirmation, payment reconciliation, cancellation, support and safety metrics;
- no public marketing for blocked services or unverified claims.

### Stage 4 — General availability

- all production gates pass for expanded services/geographies;
- readiness signed by Product, Engineering, Security, Privacy, Clinical Safety, Finance, Provider Operations, Support and SRE;
- stable period after limited release shows SLO/reconciliation/safety acceptance;
- public status page, support routes, escalation and communications live.

---

## 12. absolute production exit criteria

A general-public `GO` is prohibited until every statement below is true and evidenced:

1. **Coverage:** every launched route/screen/CTA/state has a manifest, an owner, a real contract, tests and truthful UI behavior.
2. **Actors:** patient, family, provider staff, payer, admin, finance, support and clinical safety actions are role/tenant/ownership enforced and audited.
3. **Journeys:** pharmacy, consultation, diagnostics and home-care/ nursing flow end-to-end including cancellations, failures, insurance and post-completion support.
4. **Truth:** no fake success, placeholder fact, hardcoded financial/medical/availability outcome, unapproved mock or local authority appears in production.
5. **Money:** payment, PSP webhooks, ledger, co-pay, COD, payout, refunds and disputes reconcile and are operationally supportable.
6. **PHI:** consent, delegation, access audit, revocation, retention/export/delete and vendor data flows are approved and verified.
7. **Clinical:** medical content/results/AI/emergency controls have clinical owner, proven provenance and safe escalation; unsupported functions remain disabled.
8. **Security:** threat model, scans, dependency/infrastructure hygiene and independent pen test have no unaccepted critical/high issue.
9. **Reliability:** capacity, monitoring, on-call, backup/restore, incident/recovery drills and release rollback pass agreed SLO thresholds.
10. **Experience:** Mobile/Web are accessible, RTL/localized, device/browser tested and no core state lacks loading/error/empty/retry/offline explanation.
11. **Operations:** Provider/Admin/support/finance teams have live queues, SLAs, audit and runbooks, and completed acceptance drills.
12. **Governance:** cross-functional written GO decision exists; any residual risk has named owner, expiry and approved mitigation.

If any condition is not true, the correct release decision is **NO-GO** or a deliberately limited beta—not a claim that the platform is fully production ready.

---

## References

[1]: `PATIENT_MOBILE_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — Patient Mobile source-review evidence and limits.

[2]: `PATIENT_WEB_SOURCE_REVIEW_CONSOLIDATION_2026-08-26.md` — Patient Web source-review evidence and limits.

[3]: `NABD_MASTER_EXECUTION_PROGRAM_PRODUCTION_MVP_2026-08-26.md` — previous detailed master program, expanded by this blueprint.
