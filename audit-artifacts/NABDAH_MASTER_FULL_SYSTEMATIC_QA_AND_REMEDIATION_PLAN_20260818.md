# Nabdah Master Full Systematic QA & Remediation Plan

## 1. Governance and source baseline

All work uses `obaid08642-ops/new`, branch `manus/on-live-reconciliation`, and the four committed application artifacts: Backend, Patient, Provider, and Admin. No old fix branch or unrelated repository is an implementation base. Every result is recorded as `PASS`, `FIX`, `BLOCKED`, or `INCONCLUSIVE` with evidence. Production testing uses sandbox accounts only; payment-dependent tests remain blocked when the gateway is not activated, and fail-closed contracts are never bypassed.

## 2. Universal journey model

Every feature is audited through the same complete chain: discovery/list → detail/profile → eligibility and prerequisites → beneficiary/family → mode and location → provider/slot availability → clinical context and consent → attachments → cash/insurance/payment choice → review → submit with duplicate protection → pending/approval → confirmation → reminders → provider intake → accept/reject/reassign → execution → communication/location/evidence → report/prescription/result → downstream referral/order → completion/rating → history/notifications → cancellation/reschedule/no-show/dispute/refund/ledger and recovery.

For each node we verify the visible screen, every CTA/icon, enabled/disabled logic, loading/empty/error/retry state, navigation escape route, API method/path, schema, database transition, ownership, notification, localization, accessibility, and analytics/audit evidence. A 200 response without the corresponding state and UI is not a PASS.

## 3. Patient application audit

### Account and shared foundations

Review onboarding, login, OTP/2FA, guest mode, session expiry, profile, language/device detection, RTL/LTR, light/dark system theme and manual override, permissions, addresses, family members, health records, allergies, chronic conditions, medicines, documents, notifications, support, wallet, transaction history, privacy/consent, and logout/recovery.

### Consultations and appointments

Cover doctor search/filter, specialty, profile, services, ratings, real availability, holidays, blocked periods, existing bookings, split shifts, timezone, instant versus scheduled slots, clinic versus home versus online, cash versus card/wallet versus insurance, copay, coverage pending/approved/partial/rejected, confirmation, reminders, map/address, chat, video/voice, prescriptions, referrals, lab/radiology/home-care orders, report, rating, cancellation, reschedule, no-show, and dispute.

### Pharmacy

Cover catalog/search/drug index, prescription-required versus OTC, medicine detail, quantity, stock, alternatives, prescription upload/OCR, delivery versus pickup, address, cash/card/insurance/wallet, partial insurance approval per item, cart, substitution consent, pharmacy routing, accept/reject/reassign, preparation, dispatch, tracking, proof of delivery, cancellation at each stage, reorder, refill, inventory before/after, refund/ledger, notifications, and history.

### Laboratory and radiology

Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imaging/report upload, patient access ownership, reschedule, reassignment, cancellation, report download, notification, and downstream referral.

### Nursing, home-care, facilities, and other services

Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating, no-show, cancellation, incident, payout, and facility/hospital staff roles. Extend the same model to ambulance/emergency, nutrition, maternity, mental health, AI, family records, support, and community features without inventing unsupported clinical claims or data.

## 4. Provider application audit

Review registration and KYC, provider type and effective roles, profile, photo, clinic/facility identity, services, prices, cash/insurance configuration, coverage policies, availability, working days, holidays, split shifts, blocked slots, leave, addresses, service radius, bank/wallet/payout settings, notifications, privacy, language/theme, and account state.

For operations, review inbox, queue, broadcast, search/filter, patient/order details, insurance information under minimum-necessary access, accept/reject/reassign with reasons, slot confirmation, appointment list, reminders, chat, video/voice, arrival/check-in, GPS, task execution, notes, prescriptions, referrals, reports, file upload, completion, no-show, cancellation/reschedule, ratings, ledger, payouts, support, audit history, and every role boundary between provider, staff, facility admin, and platform admin.

## 5. Admin dashboard audit

Keep existing screens and verify them against real contracts. Add or identify gaps in command center, providers, facilities, staff, patients, orders, bookings, pharmacy, labs, radiology, nursing, catalogs, medicine/drug index, insurance companies/plans/claims, approvals, disputes, payments, refunds, wallets, commissions, ledger reconciliation, notifications, support, audit logs, reports, charts, operational tracking, exports, search/filter, feature flags/configuration, privacy, role governance, data retention, and incident response.

Every dashboard metric must have a real source and time range. Every action must show confirmation, reason, audit record, authorization, success/failure state, and rollback or support path where applicable. No fabricated counts, dates, ratings, reviews, placeholder approvals, or local-only mutations are allowed.

## 6. Backend, database, and contract audit

Compile all controller routes and compare them method-by-method with consumer calls. Trace each workflow through DTO validation, guards, role normalization, ownership/BOLA checks, services, schemas, transactions, queues, storage, notifications, realtime, payment adapters, and audit logs. Verify state machines cannot skip required states, complete twice, refund twice, expose foreign data, or leave ledger/database/UI inconsistent.

Review consent scope, QR verifier, emergency location policy, unified error-code registry, WebSocket origin and participant authorization, LiveKit session ownership, chat membership, notification ownership, file access, storage expiry, payment gateway errors, webhook signature/idempotency, OTP/2FA/rate limits, Redis behavior, and multi-instance readiness. Contracts that lack legal/product approval remain fail-closed.

## 7. UX, completeness, and defect discovery rules

For each screen, ask whether the user can understand the current state, the next action, the price/coverage, the responsible actor, the expected time, and the recovery path. If a user logically needs a booking button, confirmation screen, payment result, insurance decision, tracking screen, report viewer, retry action, reschedule action, or downstream order button and it is absent, record a missing-feature defect and implement it only with a real contract.

Scan and manually verify placeholders, mock/fake/demo/sample data, hardcoded business defaults, fabricated reviews/ratings, synthetic IDs, local success toasts, stale routes, dead buttons, inconsistent labels, clipped text, RTL/LTR issues, inaccessible controls, missing loading/empty/error states, and navigation dead ends.

## 8. Verification waves

First perform source inventory and contract reconciliation. Then run typecheck, unit tests, boot tests, production builds, Expo exports/prebuilds, and Admin builds from the extracted artifacts. Next execute sandbox-only E2E by service and actor, including positive, negative, ownership, retry, cancellation, reschedule, payment-blocked, and notification cases. Every discovered issue follows: reproduce → classify → source fix → test → build → commit/push to `manus/on-live-reconciliation` → evidence update.

Device validation covers Android sizes, iOS build/TestFlight constraints, RTL/LTR and six locales, weak networks, background/foreground, orientation, permissions, mock maps, push/deep links, LiveKit, GPS, and real-device checklist items. A cloud device farm or owner-operated phones are required for capabilities unavailable in the sandbox.

## 9. Final release gates

The project is not declared ready until all critical journeys have evidence across Patient, Provider, Admin, Backend, and Database; all high-risk security tests pass; unresolved gateway or contract dependencies are explicitly blocked; builds and boot tests pass; no unclassified placeholders or dead operational buttons remain; localization/theme/accessibility review is recorded; and the final report includes a service × scenario × actor × result × evidence register. Store submission, production deployment, Moyasar activation, legal consent approval, and real-device validation remain separate gates and are never inferred from local source inspection.
