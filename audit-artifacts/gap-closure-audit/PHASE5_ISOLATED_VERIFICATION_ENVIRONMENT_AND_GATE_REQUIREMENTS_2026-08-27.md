# Nabd — Phase 5 isolated verification environment and gate requirements

**Status:** `ARTIFACTS_ONLY — ENVIRONMENT NOT PROVISIONED`
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Scope:** requirements for G1–G8 evidence defined by the Phase 5 plan; not a request to access production, create cloud resources, use secrets, or run product code.

> **Safety boundary.** Neither production nor a public endpoint may be used as a substitute for an isolated environment. Every test account, financial event, document, notification and log record must be synthetic, traceable and teardownable. A PSP/supplier sandbox is an external verification environment only after the owning team approves credentials and callback scope.

## 1. Environment topology and isolation requirements

| Component | Required Phase 5 condition | Prohibited condition | Evidence owner |
|---|---|---|---|
| Application build | Immutable source head, clean lockfile-based build, verified SBOM and environment-specific config schema. | Running uncommitted workspace code or a binary without source/lockfile provenance. | Engineering/SRE |
| API ingress | Non-public or access-controlled isolated base URL, test-only hostname, explicit CORS/CSRF/cookie domain policy and request correlation. | Production domain, shared tenant or production authentication cookies. | SRE/Security |
| MongoDB | Dedicated cluster/database plus per-run namespace; least-privilege service identity; encrypted transport; explicit fixture labels and deletion job. | Any production database, copied PHI, or shared `test` database without run namespace. | Data/SRE/Privacy |
| Redis/queues | Dedicated namespace/instance; intentional persistence/eviction config; clean start/teardown; inspectable DLQ/outbox. | Per-process fallback deciding money/identity/lock/idempotency truth. | SRE/Backend |
| Object/media storage | Separate bucket/prefix, short-lived scoped signed URLs, malware/quarantine test policy and automatic expiry. | Production objects, unrestricted public URLs or real medical documents. | Security/Privacy/Media |
| Provider/Admin actor source | Complete, checksummed source and test role fixtures are available before multi-actor journey release gates. | Simulating Provider/Admin completion from patient/backend routes or narrative claims. | Surface owners |
| Observability | Redacted structured logs, correlation/run IDs, metrics/traces, test artifact retention and access control. | Secrets, raw OTPs, PANs, PHI or unredacted document URLs in logs/reports. | SRE/Security/Privacy |

## 2. Synthetic fixture and identity controls

| Fixture category | Required properties | Teardown/retention rule |
|---|---|---|
| Patient/guardian identities | Synthetic names/phones/emails, explicit `phase5_run_id`, no production SSO/social account, roles/scopes fixed for test case. | Delete/revoke sessions at test end; retain only anonymized evidence metadata per approved policy. |
| Provider/Admin identities | Synthetic organization/facility/license/capability state and least-privilege staff roles; wrong-tenant/wrong-role controls included. | Delete/revoke accounts or reset namespace; never use real provider users. |
| Clinical/insurance data | Non-identifying policy, benefit, clinical result, document and address fixtures; cover full/partial/reject/unavailable only as declared sandbox scenarios. | Destroy source objects; preserve only approved redacted test report. |
| Financial data | PSP sandbox tokens only; test currencies/amounts and sandbox webhook events; unique payment, quote, claim and ledger references per run. | No real cards/PANs/beneficiary/bank data; reconcile and void/refund test amounts if sandbox retains them. |
| Time/concurrency | Controllable clock or short test TTL; run ID and unique idempotency keys; multi-client barrier for race tests. | Global mutable fixture reused across parallel runs. |

## 3. Required approvals before execution

| Approval | Required before | Minimum written content |
|---|---|---|
| Engineering/Data | G2/G3 | Source head, allowed test commands, database/Redis namespaces, migration/rollback strategy, fixture creator/teardown owner. |
| Security/Privacy | G3–G6 | Access route, identity model, logging redaction, data classification, test-data policy, retention/deletion confirmation. |
| Finance/PSP | G4 for payment roots | Sandbox merchant/credentials owner, webhook allowlist/signature verification, permitted currencies/amounts, ledger/reconciliation/void procedure. |
| Insurance/Provider Operations | G4/G5 for insurance roots | Sandbox/stub decision authority, provider/facility capability fixtures, full/partial/reject rules, queue/notification and escalation owner. |
| Clinical Safety | G5 for medical/AI/emergency results | Prohibited test claims, escalation scenario, result provenance policy and human owner. |
| Product/UX | G5/G8 | Approved state/CTA matrix, cash/COD/insurance policy, locales/RTL/a11y acceptance and blocked-state copy. |
| SRE/Release | G7 | Network isolation, observability, load/failure/restore scope, rollback and incident contact. |

No approval may be supplied as an oral assertion. Each is a dated record tied to the immutable source head, relevant repair-card ID and expiry.

## 4. Gate execution order for critical cards

| Gate | Applies first to | Entry condition | Required raw evidence | Failure result |
|---|---|---|---|---|
| G1 — differential/static review | All `RC-*` cards | Root card and source-head/changed path list reviewed. | `diff --check`, type/lint report, DTO/schema/migration review, secret scan, scope approval. | Reject branch/PR; root stays `OPEN`. |
| G2 — unit/contract | `RC-05A1`, `RC-04A1`, `RC-04A4`, `RC-06C2`, `RC-06C1`, `RC-03A`, `RC-03C` | Canonical state machine and API/event contracts approved. | Raw unit/contract output for positive + owner/stranger/unauth/invalid/replay paths. | No integration merge. |
| G3 — DB/Redis integration | Lock, idempotency, payment/insurance and saga cards | Isolated namespaces, migration/rollback and teardown approved. | Transaction/CAS/index checks; concurrency barriers; outage/failure/expiry/reconciliation report. | Root remains `OPEN`; no user surface enabled. |
| G4 — external sandbox | Payment/notification/media/payer/card-dependent cards | Finance/PSP/ops approval and test credentials through secure environment injection. | Signed raw webhook, delivery receipt/failure, retry/DLQ, payment/ledger reconciliation and teardown log. | No live activation or financial claim. |
| G5 — multi-actor journey E2E | Pharmacy and all booking verticals | Full Patient Mobile/Web + Provider/Admin source and actor fixtures exist. | Success + fail + partial/reject + cancel + retry + replay + race flows; request/run IDs and teardown. | No route/surface release for affected journey. |
| G6 — security/privacy | Any PHI/money/privileged card | G2/G3 package complete. | Authz tenant/owner/delegation tests; redaction/export/media review; scans and manual abuse findings. | Security owner blocks progression. |
| G7 — operations/release rehearsal | Candidate release only | G1–G6 accepted; SLO/runbooks/rollback target approved. | Load/failure/restore/migration rollback, alert delivery, dashboard and on-call drill evidence. | No deployment rollout. |
| G8 — business/UAT GO review | Limited release decision | All affected G1–G7 passes and decisions resolved. | Owner scripts, legal/clinical/finance/provider/support sign-off and named residual-risk register. | `NO-GO`. |

## 5. Critical scenario inventory for initial repair cards

| Repair card | Mandatory isolated scenarios before an E2E pass can be considered |
|---|---|
| `RC-05A1` payment | intent same-key replay; concurrent keys; wrong owner/kind; stale quote; PSP unavailable; invalid/duplicated/stale/mismatched webhook; settlement/reversal; ledger/outbox failure; no direct Admin payment marking. |
| `RC-04A1` insurance decision | owner/stranger/unauth request; no/expired policy; wrong provider tenant/facility/license; missing eligibility fails closed; concurrent full/partial/reject decisions; appeal/resubmit; event/notification outcome. |
| `RC-04A4` co-pay | full/partial/reject; wrong/absent payment ID; amount/currency mismatch; duplicate provider event/listener; pay/cancel race; confirmation failure after settlement; compensation/refund reconciliation. |
| `RC-06C2` stock/offers | wrong pharmacy/branch/staff; offer withdrawal/expiry; two patient selection contenders; inventory reservation race; conditional lock miss rollback; inventory release/reconcile after failure. |
| `RC-06C1` pharmacy journey | cart/manual/Rx/location gating; no-offer; selected offer; card/wallet/COD; full/partial/reject insurance; Web/Mobile locale/CTA/status equivalence; preparing/delivery/COD collection/return-refund. |
| `RC-03A` booking slots | capacity and reschedule races; timezone/daylight/invalid past interval; hold expiry; payment/insurance pending and failed/released outcomes; cancel/rebook. |
| `RC-03C` multi-domain checkout | single/multi-domain commands; one-domain fail; compensation failure/retry; event/outbox failure; cart truth after every terminal outcome; provider/license mismatch. |

## 6. Evidence-pack naming and retention

Every execution report must use an immutable source head and a unique run identifier:

```text
phase5/<repair-card>/<git-sha>/<UTC timestamp>/<run-id>/
```

The pack contains exact command, environment manifest without secrets, fixture IDs only, raw sanitized output, JUnit/coverage where applicable, screenshots/trace references where approved, failure/skip rationale, teardown proof, reviewer disposition and hash manifest. A green count without these elements is not gate evidence.

## 7. Current status and next authorization

The environment is **not provisioned** by this artifact. The current task remains artifacts-only. Before any G1 code remediation or any G2–G5 execution, the required owner decisions, complete Provider/Admin source, original workstation change provenance where attribution is sought, and explicit non-production environment authorization must be supplied. This document may be used by the owners to provision and approve an isolated test environment; it does not itself authorize that provisioning.
