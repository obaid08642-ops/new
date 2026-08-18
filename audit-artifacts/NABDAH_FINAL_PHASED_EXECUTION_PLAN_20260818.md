# Nabdah Final Phased Execution Plan

## Operating agreement

This plan preserves the previous remediation roadmap and adds the complete product-journey expansion. The implementation baseline is the latest `manus/on-live-reconciliation` branch in `obaid08642-ops/new`, containing Backend, Patient, Provider, and Admin artifacts. No Phase starts until the owner explicitly says **ابدأ** for that Phase.

At the end of every Phase, the process is mandatory: compare the completed work line by line against the Phase scope; inspect source and generated artifacts; run the required tests/builds or document why they are blocked; classify every item as `PASS`, `FIX`, `BLOCKED`, or `INCONCLUSIVE`; update audit artifacts and `todo.md`; commit and push only to `manus/on-live-reconciliation`; report the Phase result; then wait for the owner’s instruction before starting the next Phase.

A Phase is not complete merely because code compiles. A journey is PASS only when the relevant screens, buttons, states, API contracts, database effects, authorization, notifications, financial effects, and recovery behavior agree.

## Phase 1 — Governance, source, baseline, and evidence setup

**Purpose.** Establish a reproducible starting point and prevent scope or branch drift.

**Work.** Verify repository identity and branch tip; extract the four application artifacts; preserve the old roadmap and all known findings; define sandbox identities and production-safety rules; establish evidence naming; record current build/test/environment blockers; verify no unrelated repository is used; and define the PASS/FIX/BLOCKED/INCONCLUSIVE taxonomy.

**Deliverables.** Source authority report, artifact manifest, environment gate, evidence index, updated todo, and a frozen baseline commit.

**Exit criteria.** Source and remote match, all four artifacts are identified, no mutation has occurred outside approved sandbox rules, and the owner receives the baseline report before Phase 2 begins.

## Phase 2 — Complete Patient application inventory

**Purpose.** Audit every Patient screen, route, button, icon, input, state, and navigation path.

**Work.** Inventory onboarding, login, OTP/2FA, guest, home, search, specialties, doctors, facilities, services, medicine/drug index, tests, radiology, nursing, pharmacy, consultation, maternity, nutrition, mental health, AI, family, records, documents, profile, addresses, wallet, notifications, chat, support, community, settings, language, theme, permissions, and reports. For every action, determine its precondition, backend contract, expected loading/empty/error/retry state, confirmation screen, success state, back path, deep link, localization, accessibility, and ownership.

**Deliverables.** Patient screen/button inventory, dead-button report, missing-screen report, placeholder/hardcoded-data report, Patient route-contract map, and UX defect register.

**Exit criteria.** Every discovered Patient action is classified; no action is silently assumed complete; missing logical CTAs and states are explicitly recorded for Phase 7.

## Phase 3 — Complete Provider application inventory

**Purpose.** Audit the Provider app as both an onboarding product and an operational command center.

**Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, addresses, service radius, bank/wallet/payout settings, notifications, privacy, language/theme, and account status. Then audit inbox, queue, broadcast, search/filter, patient/order detail, insurance intake, accept/reject/reassign, appointment list, reminders, chat, video/voice, arrival/check-in, GPS, execution notes, files, prescriptions, referrals, reports, completion, no-show, cancellation/reschedule, ratings, ledger, payouts, support, and audit history.

**Deliverables.** Provider screen/button inventory, provider intake matrix, role/ownership report, operations-state map, settings and profile gap report, and Provider UX/security defects.

**Exit criteria.** Each provider type and operational action has a documented patient-to-provider contract and a negative ownership case.

## Phase 4 — Complete Admin dashboard inventory

**Purpose.** Ensure Admin can observe and control the platform without fabricated metrics or unsafe mutations.

**Work.** Audit authentication and role governance; command center; patients; providers; facilities; staff; catalogs; medicines; labs; radiology; nursing; pharmacy; bookings; orders; insurance companies/plans/claims; approvals; disputes; payments; refunds; wallets; commissions; ledger reconciliation; notifications; support; audit logs; exports; reports; charts; operational tracking; search/filter; feature flags/config; privacy; retention; incidents; and rollback/support workflows. Verify every metric has a real source, time range, query, empty state, and drill-down.

**Deliverables.** Admin screen/action map, controls and permissions matrix, report/chart source map, fabricated-data findings, and admin operational gap register.

**Exit criteria.** Every Admin mutation has authorization, confirmation, reason, audit trail, safe error, and rollback/support handling where applicable.

## Phase 5 — Backend, Database, and contract/state audit

**Purpose.** Reconcile the product surfaces with the actual server and persistence model.

**Work.** Compile controller routes and compare method/path/parameters with all consumers. Trace DTO validation, guards, effective provider roles, ownership/BOLA, services, schemas, transactions, queues, storage, notifications, realtime, payment adapters, webhooks, audit logs, and state machines. Verify no transition can skip required approval, complete twice, refund twice, expose foreign data, or leave UI/database/ledger inconsistent. Review consent, QR verifier, emergency location, error-code registry, chat membership, LiveKit ownership, file access, storage expiry, OTP/2FA/rate limits, Redis, and multi-instance behavior.

**Deliverables.** Route-contract reconciliation, state-machine matrix, schema/data-flow map, security findings, error registry review, and database/ledger consistency report.

**Exit criteria.** Each high-risk consumer has a real backend contract or is classified BLOCKED; no missing route is treated as a defect until dynamic/template aliases are reconstructed.

## Phase 6 — Service × journey × branch matrix

**Purpose.** Convert the audit into complete operational journeys, not isolated endpoint checks.

**Work.** For every service run the universal chain: discovery → detail → eligibility → beneficiary → mode/location → provider/slot → consent/context/files → cash/insurance/payment → review → submit/idempotency → pending/approval → confirmation → reminders → provider intake → accept/reject/reassign → execution → communication/location/evidence → report/prescription/result → downstream order/referral → completion/rating → history/notifications → cancellation/reschedule/no-show/dispute/refund/ledger/recovery.

**Service coverage.** Consultations; pharmacy; laboratory; radiology; nursing/home-care; hospitals/facilities; ambulance/emergency; nutrition; maternity; mental health; AI; family/records; wallet; support/community; and shared account flows.

**Branch coverage.** Online, clinic/branch, home, delivery, pickup, immediate, scheduled, cash, card/sandbox, wallet, self-pay, insurance pending/approved/partial/rejected, copay, provider rejection, reassignment, unavailable stock, invalid slot, cancellation at every stage, reschedule, no-show, timeout/offline/retry, and foreign-actor mutation.

**Deliverables.** Master scenario matrix, expected screen/state map, actor handoff map, notification map, financial/ledger map, and evidence checklist.

**Exit criteria.** Every service and branch has an owner, expected states, required screens/buttons, backend transitions, and evidence fields.

## Phase 7 — Source remediation and product improvement

**Purpose.** Implement defects and logical gaps found in Phases 2–6.

**Work.** Remove fake/mock/demo/sample data, hardcoded business defaults, synthetic IDs, local-only success toasts, stale routes, dead buttons, and unsafe fallbacks. Build missing logical screens and CTAs only where a real contract exists: booking, slot selection, review, payment, insurance pending/decision/copay, confirmation, tracking, report/result, reschedule, downstream orders, provider intake, admin drill-down, and recovery. Fix UI/UX, loading/empty/error/retry flows, navigation, accessibility, RTL/LTR, translations, theme, security, ownership, privacy, and real backend/database integration.

**Deliverables.** Source commits grouped by feature, tests for each fix, updated contracts, screenshots/logs where relevant, and defect closure register.

**Exit criteria.** Each fix reproduces the original issue, includes a source change, has a targeted test, passes the relevant build/typecheck, and is pushed to the approved branch.

## Phase 8 — Build, unit, boot, and integration gates

**Purpose.** Prove each artifact is buildable and starts correctly before live E2E.

**Work.** Run Backend typecheck, unit tests, integration tests, boot/app.init tests, migrations/schema checks, and production build. Run Patient and Provider typecheck, tests, Expo export/prebuild/build checks, asset/deep-link checks. Run Admin lint/typecheck/test/production build. Validate package locks, environment contracts, no secrets in source, and no inode/environment blocker hidden by partial installation.

**Deliverables.** Per-artifact build/test report, boot evidence, package/environment report, migration report, and blocker register.

**Exit criteria.** All available gates pass; unavailable gates have an explicit reproducible BLOCKED reason and owner action.

## Phase 9 — Sandbox E2E and integration validation

**Purpose.** Execute the full workflows with sandbox actors and production-safe rules.

**Work.** Test patient/provider/admin journeys for all service branches. Verify owner versus foreign reads and mutations, provider intake, notifications, chat membership, WebSocket origin/token/reconnect, LiveKit, OTP/2FA/rate limits, payment sandbox/webhook/idempotency, refund/ledger behavior, file/report ownership, insurance decision states, and cancellation/reschedule/no-show. Use `--resolve` or approved connectivity method consistently when required. Do not bypass payment gateway activation, fail-closed SOS/QR/consent, or create non-sandbox mutations.

**Deliverables.** Evidence-rich E2E matrix with steps, requests/responses, IDs, before/after state, notifications, ledger effects, screenshots/logs, and PASS/FIX/BLOCKED result.

**Exit criteria.** Every attempted scenario has an evidence row; blocked commercial/legal/infrastructure dependencies are named and not disguised as PASS.

## Phase 10 — Device, localization, accessibility, and UX validation

**Purpose.** Verify behavior beyond source and API tests.

**Work.** Test Android small/medium/tablet, iOS build/TestFlight path, Huawei path where supported, six locales, automatic device language, manual language switch, RTL/LTR, light/dark system preference and override, weak network, background/foreground, orientation, permissions, maps/mock location, push/deep links, terminated-app notifications, LiveKit, GPS, file uploads, accessibility, dynamic text, and crash/recovery. Use cloud device farm where available and prepare owner real-device checklist for push, calls, GPS, and physical movement.

**Deliverables.** Device matrix, screenshots/videos/logs, localization/accessibility defect list, crash/performance report, and owner real-device checklist.

**Exit criteria.** Automated/device-farm cases are classified; owner-only real-device cases are clearly separated and not falsely marked complete.

## Phase 11 — Final readiness, release, and stores

**Purpose.** Produce the final decision package without overstating readiness.

**Work.** Re-read every Phase checklist; reconcile all PASS/FIX/BLOCKED/INCONCLUSIVE items; verify no unclassified placeholders or dead operational buttons; review security/privacy/legal/product approval; confirm Moyasar/payment readiness; confirm backup/restore, observability, scaling, SEO/GEO/web, store signing, privacy manifests, push credentials, crash reporting, rollback, release notes, and support runbooks. Prepare final reports for owner, developer, auditor, and release manager.

**Deliverables.** Final QA register, fixed-defect report, unresolved blocker report, source/build/E2E evidence index, device readiness report, store checklist, rollback/recovery checklist, and explicit readiness decision.

**Exit criteria.** The project is declared ready only for the scope actually evidenced. Publishing/deployment is performed by the owner through the approved process; no deployment or store submission is inferred from a local commit.

## Required completion report after every Phase

Each Phase report must contain: Phase number and exact scope; checklist of every planned item; files/commits changed; tests/builds executed; scenarios and evidence; PASS/FIX/BLOCKED/INCONCLUSIVE table; unresolved risks; comparison against the plan; corrections made after the double-check; pushed commit and branch; and the explicit statement that the next Phase is waiting for the owner’s command.

## Phase 7 — Competitive UX and workflow benchmark

**Purpose.** Compare Nabdah’s intended journeys with leading products by domain, without copying protected design or assuming unverified behavior.

**Research cohorts.** Teleconsultation and doctor booking; pharmacy and e-prescription; laboratory; radiology/imaging; home nursing and care; hospitals/facilities; nutrition, maternity, and mental health; and integrated health platforms. The cohort may include regional and international examples such as Vezeeta/Visita, Teladoc, and domain-specific services where public evidence is available.

**Work.** For each competitor and accessible platform, record source URL, date, platform, country/market, actor, task, screen sequence, CTA, state transitions, pricing/insurance disclosure, provider intake and completion flow, notifications, recovery paths, accessibility/trust signals, and confidence. Separate observed facts from interpretation and recommendations. Compare against Nabdah by actor, screen, action, state, handoff, contract implication, and release priority.

**Boundaries.** Use public pages, permitted app/store material, official documentation, and user-authorized access only. Do not bypass authentication, scrape private data, fabricate competitor behavior, or copy protected content/design. The outcome is a requirements and opportunity benchmark, not a claim that competitor flows are universally correct.

**Deliverables.** Competitor cohort register, evidence-backed screen/workflow maps, Nabdah comparison matrix, strengths/gaps/opportunities report, prioritized recommendations, and change requests mapped to existing phases.

**Exit criteria.** Findings are source-cited and confidence-labeled; validated opportunities are converted into explicit Nabdah requirements or intentionally rejected with rationale; no previous Phase or requirement is removed.
