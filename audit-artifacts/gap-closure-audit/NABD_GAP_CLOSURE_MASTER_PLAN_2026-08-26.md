# Nabd Gap-Closure Master Plan

## 1. الحكم الحالي

المشروع **NO-GO**. لا توجد أدلة كافية بعد للقول إن Patient Web يطابق Patient Mobile، أو أن Provider/Admin مكتملان، أو أن كل data signal حقيقي، أو أن الرحلات المالية والسريرية مؤمنة ومثبتة. توجد أدلة تدقيق واسعة و80 root controls و62 static finding تحتاج reconfirmation، لكنها لا تعفي من مراجعة شاشة/CTA/سيناريو/عقد كاملة.[1]

الهدف ليس إطلاق عدد كبير من الشاشات بسرعة؛ الهدف هو إغلاق كل Screen–Action–Scenario row بدليل صحيح. لا يمكن ضمان «صفر فجوات» بعبارة عامة؛ يتحقق ذلك فقط عندما يصبح لكل item في inventory disposition واختبار وevidence، وعندما تمر البوابات النهائية المستقلة.

## 2. baseline scope and known inventory

| السطح | baseline inventory | الحالة |
|---|---:|---|
| Patient Mobile | 246 route/screen candidates، 41 domain | كل الصفوف غير reviewed يدويًا بعد |
| Patient Web | 60 localized UI pages، 13 BFF/API handlers | 246 Mobile rows بلا mapping مقبول حتى الآن |
| Provider | 45 screen candidates | role/CTA/contract/security scenarios غير reviewed |
| Admin | 42 page candidates | RBAC/audit/financial/operations scenarios غير reviewed |
| Mock/placeholder/TODO scan | 628 source signals | candidates فقط؛ كل واحد يحتاج disposition يدويًا |

وجود 246 Mobile route يفسر تقدير المالك ~249. الفارق بين 246 و60 لا يثبت تلقائيًا 186 Web screens ناقصة؛ لكنه يجعل claim parity مستحيلًا قبل mapping يدوي لكل صف.[2]

## 3. operating model

ثلاثة agents يعملون بالتوازي، لكن تحت **Backend/Data Contract Owner** مركزي. لا يحق لأي UI agent إنشاء API من تخمين أو وضع mock success أو تعديل financial/insurance state machine أو دمج إلى main. يعمل owner المركزي على branch منفصل للعقود ويصدر contract version لكل vertical slice.

| المسار | المالك | مسؤولية حصرية |
|---|---|---|
| Core Backend/Data | Contract Owner | identity/RBAC/ownership، DTO/OpenAPI، states، price/stock/quote، insurance، payments/ledger/webhooks، locking/idempotency، migrations، telemetry |
| Agent 1 | Patient Mobile + Patient Web | full mobile screen inventory، Web parity، patient UX/a11y/RTL، states وCTA integration |
| Agent 2 | Provider | onboarding، role operations، quotes/fulfillment/clinical execution، provider finance/insurance workflows |
| Agent 3 | Admin | governance/RBAC، moderation، operations queues، finance controls، security/privacy/audit/release controls |

## 4. Phase G0 — mandatory truth inventory, before remediation

لا يبدأ بناء parity أو feature completion قبل إنجاز G0. كل صف شاشة يجب أن يحصل على stable ID وevidence. هذه المرحلة هي الجواب العملي عن نقص الفحص السابق.

| deliverable | owner | acceptance |
|---|---|---|
| Mobile screen/action/scenario inventory | Agent 1 | 246 rows reviewed؛ كل CTA مؤثر child row؛ no `NOT_YET_MANUALLY_REVIEWED` |
| Web mapping register | Agent 1 | لكل Mobile row: Web page/state/modal أو `NATIVE_ONLY` مع rationale وبديل يحفظ user goal |
| Provider role completion matrix | Agent 2 | لكل provider type: onboarding → operations → financial/insurance → settings → error/cancel/offline |
| Admin control matrix | Agent 3 | لكل admin page: allowed role، data scope، audit event، destructive guard، maker-checker where required |
| Mock/placeholder disposition register | Agents + Contract Owner | كل 628 signal: test-only/legitimate copy/real contract/remove؛ no unclassified production signal |
| Contract evidence register | Contract Owner | CTA → request/event → DTO → controller/service/state → authorization → notification/result؛ no keyword inference |

## 5. Phase G1 — core controls and shared contracts

ينفذ Contract Owner قبل أو بالتوازي مع أول vertical slice:

1. session/OTP/passkey/2FA/recovery/rate limits/device trust/revocation؛
2. owner/stranger/unauth/wrong-role/tenant policy؛
3. DTO validation/error taxonomy/idempotency/optimistic concurrency/outbox; 
4. quote/price/stock/provider eligibility authoritative model؛
5. insurance request/decision/full-partial-reject/co-pay/expiry/audit model؛
6. payment intent/webhook signature/replay/ledger/refund/dispute/COD model؛
7. slot/visit lock and lifecycle for consultations/diagnostics/home-care؛
8. audit log/notifications/result/report provenance and PHI controls؛
9. migration/backup/restore/observability baselines.

No UI flow may show `success`, `paid`, `confirmed`, `approved`, `available`, `in-stock`, `covered`, or `result-ready` from local inference.

## 6. Vertical slice sequence

كل slice: contract → backend/data → Agent 1/2/3 surfaces → security/ownership/financial tests → review → remote-verified push. لا تسليم دفعة واحدة.

| slice | patient | provider | admin | non-negotiable states |
|---|---|---|---|---|
| S1 Pharmacy Cash/Card/COD | cart/request/broadcast/offers/select/payment/tracking | eligible broadcast/quote/substitute/ETA/prep/delivery/COD collection | policy/exception/reconciliation | no offer, expired offer, double select, payment failure, COD not paid, cancel/refund |
| S2 Pharmacy Insurance | select offer/request decision/co-pay/payment/confirmation | full/partial/reject/co-pay decision | insurance queue/audit/override governance | expiry, reject, co-pay retry, change-to-cash, duplicate decision |
| S3 Consultation Cash | specialty/doctor/slot/payment/confirmation/call/cancel/reschedule | schedule/attendance/clinical summary | provider/service moderation, refunds | lock race, price change, no-show, call token TTL, refund |
| S4 Consultation Insurance | request without payment/decision/co-pay/confirm | decision/acceptance | audit/escalation | decision expiry, partial cover, co-pay failure |
| S5 Labs/Radiology | catalog/package/provider/slot or sample/insurance/results | order/sample/scan/report | catalog/quality/exception queue | result ownership, critical result escalation, correction/version |
| S6 Nursing/Home-care | service/provider/address/visit/insurance/tracking | field assignment/check-in/visit/report | dispatch/SLA/safety | geo consent, late visit, reassignment, safety escalation |
| S7 Family/Health/Prescriptions | delegation/consent/vitals/medications/prescriptions | scoped professional access | privacy/audit/deletion | invite expiry, revoke, wrong scope, PHI redaction |
| S8 Chat/Support/Reports | membership/media/support ticket/results | provider response/escalation | support roles/audit | stranger access, malware attachment, retention, emergency escalation |
| S9 Platform completion | settings/language/location/accessibility/SEO Web | staff/settings/notifications | feature flags/release/analytics | offline/retry/empty/error/RTL/a11y |

## 7. Agent-specific checklists

### Agent 1: Patient Mobile + Web

The agent starts from the 246-row inventory, not from a design guess. It maps all Mobile paths, including auth/onboarding, dashboard, pharmacy, diagnostics, consultations, insurance, family, health, maternity, mental health, nutrition, nursing, wallet, orders, reports, articles/community, emergency, settings, support, and accessibility. For every Web equivalent, it validates responsive behavior, browser back/deep links, locale/RTL, keyboard/screen reader, skeleton/loading/error/empty/retry, and truthful data. Native-only capabilities—camera/barcode, permissions, wearable, device location/calling—require an approved Web alternative, not silent omission.

### Agent 2: Provider

The agent starts from 45 candidate components and a matrix for Pharmacy, Doctor, Lab, Radiology, Nursing/Home-care, Facility, Ambulance, and staff roles. The agent must dismantle or validate `BlueprintScreens`, simulated/polling radar behavior, and any mock/skeleton signal. Provider completion includes onboarding/review, documents and licenses, staff/facility binding, hours/availability, inbound request eligibility, quote/stock/substitutes/ETA, insurance decisions, clinical/field execution, reports/results, COD/payout visibility, disputes, support, settings, notifications, offline/reconnect, and security/PHI boundaries.

### Agent 3: Admin

The agent starts from 42 pages and completes an admin control plane rather than decorative dashboards. Every admin CTA receives allowed roles, data scope, audit event, maker-checker or explicit single-actor policy, reversible/irreversible confirmation, reason codes, export safeguards, and error/retry state. Required domains include provider/catalog/insurance governance, financial ledger/payout/refund/dispute, support, SOS/ambulance, device/session/security, notifications, retention/deletion, analytics truthfulness, feature flags, and incident/release controls.

## 8. Definition of Done per item

An item is not complete because a component compiles or a button is visible. It is complete only if all applicable conditions are true:

1. screen/CTA/navigation reviewed against the source of truth;
2. UX visual state, RTL/i18n, accessibility, reduced motion, loading/empty/error/retry/cancel verified;
3. exact API/socket/DTO/error contract exists and is versioned;
4. backend authorization, tenant, consent, state and idempotency rules exist;
5. server truth controls price, stock, insurance, payment, results, and status;
6. owner/stranger/unauth/wrong-role and replay/concurrency tests pass;
7. sandbox E2E runs only where contract and test accounts are authorized;
8. no production mock/placeholder signal remains unclassified;
9. feature has observability, audit/notification/output evidence where required;
10. independent reviewer verifies commit, remote head, evidence, and rollback plan.

## 9. production gates

No production claim before security/privacy/payment/reliability/performance gates in `NABD_PRODUCTION_GATES_SECURITY_PERFORMANCE_TESTING_2026-08-25.md`. Scale to thousands or millions requires a capacity model, approved SLOs, representative load/soak/failure testing, database/cache/queue architecture, monitoring, restore drill, and rollback evidence. It cannot be inferred from UI or source inspection.[3]

## 10. immediate next action requiring approval

Approve **G0** as the first work package. It does not fix product code. It completes the inventories and turns current uncertainty into a signed gap register. After G0, approve S1 Pharmacy Cash/Card/COD as the first integrated implementation slice. This sequencing honors the canonical journey rules while ensuring contracts and security are fixed before parallel UI construction.

## references

[1]: `GAP_CLOSURE_EVIDENCE_INVENTORY_2026-08-25.md`, `NABD_Normalized_Remediation_Backlog_2026-08-25.md`, and Phase 0D reviewer decisions.

[2]: `PATIENT_MOBILE_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv` and `PATIENT_WEB_PARITY_BASELINE_GAP_REPORT_2026-08-26.md`.

[3]: `NABD_PRODUCTION_GATES_SECURITY_PERFORMANCE_TESTING_2026-08-25.md`.
