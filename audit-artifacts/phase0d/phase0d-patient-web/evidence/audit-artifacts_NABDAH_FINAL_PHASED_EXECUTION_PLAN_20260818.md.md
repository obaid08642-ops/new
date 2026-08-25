# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_FINAL_PHASED_EXECUTION_PLAN_20260818.md`
- **Member SHA-256:** `4d58a7f51bc4cf8b1854322480cee45c9ea128705b664749360199a7607b4de0`
- **Line count:** 141
- **Read range:** `1-141`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: A Phase is not complete merely because code compiles. A journey is PASS only when the relevant screens, buttons, states, API contracts, database effects, authorization, notifications, financial effects, and recovery behavior agree.`
- `23: **Purpose.** Audit every Patient screen, route, button, icon, input, state, and navigation path.`
- `25: **Work.** Inventory onboarding, login, OTP/2FA, guest, home, search, specialties, doctors, facilities, services, medicine/drug index, tests, radiology, nursing, pharmacy, consultation, maternity, nutrition, mental health, AI, family, record`
- `27: **Deliverables.** Patient screen/button inventory, dead-button report, missing-screen report, placeholder/hardcoded-data report, Patient route-contract map, and UX defect register.`
- `35: **Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, `
- `37: **Deliverables.** Provider screen/button inventory, provider intake matrix, role/ownership report, operations-state map, settings and profile gap report, and Provider UX/security defects.`
- `45: **Work.** Audit authentication and role governance; command center; patients; providers; facilities; staff; catalogs; medicines; labs; radiology; nursing; pharmacy; bookings; orders; insurance companies/plans/claims; approvals; disputes; pa`
- `47: **Deliverables.** Admin screen/action map, controls and permissions matrix, report/chart source map, fabricated-data findings, and admin operational gap register.`
- `55: **Work.** Compile controller routes and compare method/path/parameters with all consumers. Trace DTO validation, guards, effective provider roles, ownership/BOLA, services, schemas, transactions, queues, storage, notifications, realtime, pa`
- `57: **Deliverables.** Route-contract reconciliation, state-machine matrix, schema/data-flow map, security findings, error registry review, and database/ledger consistency report.`
- `59: **Exit criteria.** Each high-risk consumer has a real backend contract or is classified BLOCKED; no missing route is treated as a defect until dynamic/template aliases are reconstructed.`
- `65: **Work.** For every service run the universal chain: discovery → detail → eligibility → beneficiary → mode/location → provider/slot → consent/context/files → cash/insurance/payment → review → submit/idempotency → pending/approval → confirma`
### backend_consumers_or_contracts
- `35: **Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, `
- `65: **Work.** For every service run the universal chain: discovery → detail → eligibility → beneficiary → mode/location → provider/slot → consent/context/files → cash/insurance/payment → review → submit/idempotency → pending/approval → confirma`
- `67: **Service coverage.** Consultations; pharmacy; laboratory; radiology; nursing/home-care; hospitals/facilities; ambulance/emergency; nutrition; maternity; mental health; AI; family/records; wallet; support/community; and shared account flows`
- `99: **Work.** Test patient/provider/admin journeys for all service branches. Verify owner versus foreign reads and mutations, provider intake, notifications, chat membership, WebSocket origin/token/reconnect, LiveKit, OTP/2FA/rate limits, payme`
- `135: **Work.** For each competitor and accessible platform, record source URL, date, platform, country/market, actor, task, screen sequence, CTA, state transitions, pricing/insurance disclosure, provider intake and completion flow, notifications`
### auth_ownership
- `5: This plan preserves the previous remediation roadmap and adds the complete product-journey expansion. The implementation baseline is the latest `manus/on-live-reconciliation` branch in `obaid08642-ops/new`, containing Backend, Patient, Prov`
- `7: At the end of every Phase, the process is mandatory: compare the completed work line by line against the Phase scope; inspect source and generated artifacts; run the required tests/builds or document why they are blocked; classify every ite`
- `9: A Phase is not complete merely because code compiles. A journey is PASS only when the relevant screens, buttons, states, API contracts, database effects, authorization, notifications, financial effects, and recovery behavior agree.`
- `19: **Exit criteria.** Source and remote match, all four artifacts are identified, no mutation has occurred outside approved sandbox rules, and the owner receives the baseline report before Phase 2 begins.`
- `25: **Work.** Inventory onboarding, login, OTP/2FA, guest, home, search, specialties, doctors, facilities, services, medicine/drug index, tests, radiology, nursing, pharmacy, consultation, maternity, nutrition, mental health, AI, family, record`
- `35: **Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, `
- `37: **Deliverables.** Provider screen/button inventory, provider intake matrix, role/ownership report, operations-state map, settings and profile gap report, and Provider UX/security defects.`
- `39: **Exit criteria.** Each provider type and operational action has a documented patient-to-provider contract and a negative ownership case.`
- `41: ## Phase 4 — Complete Admin dashboard inventory`
- `43: **Purpose.** Ensure Admin can observe and control the platform without fabricated metrics or unsafe mutations.`
- `45: **Work.** Audit authentication and role governance; command center; patients; providers; facilities; staff; catalogs; medicines; labs; radiology; nursing; pharmacy; bookings; orders; insurance companies/plans/claims; approvals; disputes; pa`
- `47: **Deliverables.** Admin screen/action map, controls and permissions matrix, report/chart source map, fabricated-data findings, and admin operational gap register.`
### state_transitions
- `7: At the end of every Phase, the process is mandatory: compare the completed work line by line against the Phase scope; inspect source and generated artifacts; run the required tests/builds or document why they are blocked; classify every ite`
- `9: A Phase is not complete merely because code compiles. A journey is PASS only when the relevant screens, buttons, states, API contracts, database effects, authorization, notifications, financial effects, and recovery behavior agree.`
- `19: **Exit criteria.** Source and remote match, all four artifacts are identified, no mutation has occurred outside approved sandbox rules, and the owner receives the baseline report before Phase 2 begins.`
- `23: **Purpose.** Audit every Patient screen, route, button, icon, input, state, and navigation path.`
- `25: **Work.** Inventory onboarding, login, OTP/2FA, guest, home, search, specialties, doctors, facilities, services, medicine/drug index, tests, radiology, nursing, pharmacy, consultation, maternity, nutrition, mental health, AI, family, record`
- `29: **Exit criteria.** Every discovered Patient action is classified; no action is silently assumed complete; missing logical CTAs and states are explicitly recorded for Phase 7.`
- `35: **Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, `
- `37: **Deliverables.** Provider screen/button inventory, provider intake matrix, role/ownership report, operations-state map, settings and profile gap report, and Provider UX/security defects.`
- `45: **Work.** Audit authentication and role governance; command center; patients; providers; facilities; staff; catalogs; medicines; labs; radiology; nursing; pharmacy; bookings; orders; insurance companies/plans/claims; approvals; disputes; pa`
- `49: **Exit criteria.** Every Admin mutation has authorization, confirmation, reason, audit trail, safe error, and rollback/support handling where applicable.`
- `51: ## Phase 5 — Backend, Database, and contract/state audit`
- `55: **Work.** Compile controller routes and compare method/path/parameters with all consumers. Trace DTO validation, guards, effective provider roles, ownership/BOLA, services, schemas, transactions, queues, storage, notifications, realtime, pa`
### payment_insurance_relevance
- `15: **Work.** Verify repository identity and branch tip; extract the four application artifacts; preserve the old roadmap and all known findings; define sandbox identities and production-safety rules; establish evidence naming; record current b`
- `25: **Work.** Inventory onboarding, login, OTP/2FA, guest, home, search, specialties, doctors, facilities, services, medicine/drug index, tests, radiology, nursing, pharmacy, consultation, maternity, nutrition, mental health, AI, family, record`
- `35: **Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, `
- `45: **Work.** Audit authentication and role governance; command center; patients; providers; facilities; staff; catalogs; medicines; labs; radiology; nursing; pharmacy; bookings; orders; insurance companies/plans/claims; approvals; disputes; pa`
- `55: **Work.** Compile controller routes and compare method/path/parameters with all consumers. Trace DTO validation, guards, effective provider roles, ownership/BOLA, services, schemas, transactions, queues, storage, notifications, realtime, pa`
- `65: **Work.** For every service run the universal chain: discovery → detail → eligibility → beneficiary → mode/location → provider/slot → consent/context/files → cash/insurance/payment → review → submit/idempotency → pending/approval → confirma`
- `67: **Service coverage.** Consultations; pharmacy; laboratory; radiology; nursing/home-care; hospitals/facilities; ambulance/emergency; nutrition; maternity; mental health; AI; family/records; wallet; support/community; and shared account flows`
- `69: **Branch coverage.** Online, clinic/branch, home, delivery, pickup, immediate, scheduled, cash, card/sandbox, wallet, self-pay, insurance pending/approved/partial/rejected, copay, provider rejection, reassignment, unavailable stock, invalid`
- `79: **Work.** Remove fake/mock/demo/sample data, hardcoded business defaults, synthetic IDs, local-only success toasts, stale routes, dead buttons, and unsafe fallbacks. Build missing logical screens and CTAs only where a real contract exists: `
- `99: **Work.** Test patient/provider/admin journeys for all service branches. Verify owner versus foreign reads and mutations, provider intake, notifications, chat membership, WebSocket origin/token/reconnect, LiveKit, OTP/2FA/rate limits, payme`
- `119: **Work.** Re-read every Phase checklist; reconcile all PASS/FIX/BLOCKED/INCONCLUSIVE items; verify no unclassified placeholders or dead operational buttons; review security/privacy/legal/product approval; confirm Moyasar/payment readiness; `
- `135: **Work.** For each competitor and accessible platform, record source URL, date, platform, country/market, actor, task, screen sequence, CTA, state transitions, pricing/insurance disclosure, provider intake and completion flow, notifications`
### error_empty_loading_retry_cancel
- `25: **Work.** Inventory onboarding, login, OTP/2FA, guest, home, search, specialties, doctors, facilities, services, medicine/drug index, tests, radiology, nursing, pharmacy, consultation, maternity, nutrition, mental health, AI, family, record`
- `35: **Work.** Cover registration/KYC, provider type, effective roles, profile, personal/clinic/hospital identity, photos, services, prices, cash/insurance settings, coverage policies, working days, holidays, split shifts, blocked slots, leave, `
- `45: **Work.** Audit authentication and role governance; command center; patients; providers; facilities; staff; catalogs; medicines; labs; radiology; nursing; pharmacy; bookings; orders; insurance companies/plans/claims; approvals; disputes; pa`
- `49: **Exit criteria.** Every Admin mutation has authorization, confirmation, reason, audit trail, safe error, and rollback/support handling where applicable.`
- `55: **Work.** Compile controller routes and compare method/path/parameters with all consumers. Trace DTO validation, guards, effective provider roles, ownership/BOLA, services, schemas, transactions, queues, storage, notifications, realtime, pa`
- `57: **Deliverables.** Route-contract reconciliation, state-machine matrix, schema/data-flow map, security findings, error registry review, and database/ledger consistency report.`
- `65: **Work.** For every service run the universal chain: discovery → detail → eligibility → beneficiary → mode/location → provider/slot → consent/context/files → cash/insurance/payment → review → submit/idempotency → pending/approval → confirma`
- `69: **Branch coverage.** Online, clinic/branch, home, delivery, pickup, immediate, scheduled, cash, card/sandbox, wallet, self-pay, insurance pending/approved/partial/rejected, copay, provider rejection, reassignment, unavailable stock, invalid`
- `79: **Work.** Remove fake/mock/demo/sample data, hardcoded business defaults, synthetic IDs, local-only success toasts, stale routes, dead buttons, and unsafe fallbacks. Build missing logical screens and CTAs only where a real contract exists: `
- `99: **Work.** Test patient/provider/admin journeys for all service branches. Verify owner versus foreign reads and mutations, provider intake, notifications, chat membership, WebSocket origin/token/reconnect, LiveKit, OTP/2FA/rate limits, payme`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
