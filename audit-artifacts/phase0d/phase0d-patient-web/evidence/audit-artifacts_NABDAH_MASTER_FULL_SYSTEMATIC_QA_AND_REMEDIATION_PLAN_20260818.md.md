# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_MASTER_FULL_SYSTEMATIC_QA_AND_REMEDIATION_PLAN_20260818.md`
- **Member SHA-256:** `a8aa552e3a54cba876b24b15e6cbe5f2982ec4cbfd22ceff7e8cc84dc4094769`
- **Line count:** 73
- **Read range:** `1-73`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: Every feature is audited through the same complete chain: discovery/list → detail/profile → eligibility and prerequisites → beneficiary/family → mode and location → provider/slot availability → clinical context and consent → attachments → c`
- `11: For each node we verify the visible screen, every CTA/icon, enabled/disabled logic, loading/empty/error/retry state, navigation escape route, API method/path, schema, database transition, ownership, notification, localization, accessibility`
- `17: Review onboarding, login, OTP/2FA, guest mode, session expiry, profile, language/device detection, RTL/LTR, light/dark system theme and manual override, permissions, addresses, family members, health records, allergies, chronic conditions, `
- `21: Cover doctor search/filter, specialty, profile, services, ratings, real availability, holidays, blocked periods, existing bookings, split shifts, timezone, instant versus scheduled slots, clinic versus home versus online, cash versus card/w`
- `25: Cover catalog/search/drug index, prescription-required versus OTC, medicine detail, quantity, stock, alternatives, prescription upload/OCR, delivery versus pickup, address, cash/card/insurance/wallet, partial insurance approval per item, ca`
- `29: Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imagi`
- `33: Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating,`
- `39: For operations, review inbox, queue, broadcast, search/filter, patient/order details, insurance information under minimum-necessary access, accept/reject/reassign with reasons, slot confirmation, appointment list, reminders, chat, video/voi`
- `43: Keep existing screens and verify them against real contracts. Add or identify gaps in command center, providers, facilities, staff, patients, orders, bookings, pharmacy, labs, radiology, nursing, catalogs, medicine/drug index, insurance com`
- `49: Compile all controller routes and compare them method-by-method with consumer calls. Trace each workflow through DTO validation, guards, role normalization, ownership/BOLA checks, services, schemas, transactions, queues, storage, notificati`
- `55: For each screen, ask whether the user can understand the current state, the next action, the price/coverage, the responsible actor, the expected time, and the recovery path. If a user logically needs a booking button, confirmation screen, p`
- `57: Scan and manually verify placeholders, mock/fake/demo/sample data, hardcoded business defaults, fabricated reviews/ratings, synthetic IDs, local success toasts, stale routes, dead buttons, inconsistent labels, clipped text, RTL/LTR issues, `
### backend_consumers_or_contracts
- `9: Every feature is audited through the same complete chain: discovery/list → detail/profile → eligibility and prerequisites → beneficiary/family → mode and location → provider/slot availability → clinical context and consent → attachments → c`
- `21: Cover doctor search/filter, specialty, profile, services, ratings, real availability, holidays, blocked periods, existing bookings, split shifts, timezone, instant versus scheduled slots, clinic versus home versus online, cash versus card/w`
- `25: Cover catalog/search/drug index, prescription-required versus OTC, medicine detail, quantity, stock, alternatives, prescription upload/OCR, delivery versus pickup, address, cash/card/insurance/wallet, partial insurance approval per item, ca`
- `29: Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imagi`
- `33: Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating,`
- `37: Review registration and KYC, provider type and effective roles, profile, photo, clinic/facility identity, services, prices, cash/insurance configuration, coverage policies, availability, working days, holidays, split shifts, blocked slots, `
- `51: Review consent scope, QR verifier, emergency location policy, unified error-code registry, WebSocket origin and participant authorization, LiveKit session ownership, chat membership, notification ownership, file access, storage expiry, paym`
- `71: The plan also explicitly covers search and catalog freshness, pricing/tax/commission/discount/currency rules, fraud and abuse resistance, privacy retention/export/deletion, medical-file access logs, structured observability and correlation `
### auth_ownership
- `5: All work uses `obaid08642-ops/new`, branch `manus/on-live-reconciliation`, and the four committed application artifacts: Backend, Patient, Provider, and Admin. No old fix branch or unrelated repository is an implementation base. Every resul`
- `11: For each node we verify the visible screen, every CTA/icon, enabled/disabled logic, loading/empty/error/retry state, navigation escape route, API method/path, schema, database transition, ownership, notification, localization, accessibility`
- `17: Review onboarding, login, OTP/2FA, guest mode, session expiry, profile, language/device detection, RTL/LTR, light/dark system theme and manual override, permissions, addresses, family members, health records, allergies, chronic conditions, `
- `29: Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imagi`
- `33: Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating,`
- `37: Review registration and KYC, provider type and effective roles, profile, photo, clinic/facility identity, services, prices, cash/insurance configuration, coverage policies, availability, working days, holidays, split shifts, blocked slots, `
- `39: For operations, review inbox, queue, broadcast, search/filter, patient/order details, insurance information under minimum-necessary access, accept/reject/reassign with reasons, slot confirmation, appointment list, reminders, chat, video/voi`
- `41: ## 5. Admin dashboard audit`
- `43: Keep existing screens and verify them against real contracts. Add or identify gaps in command center, providers, facilities, staff, patients, orders, bookings, pharmacy, labs, radiology, nursing, catalogs, medicine/drug index, insurance com`
- `45: Every dashboard metric must have a real source and time range. Every action must show confirmation, reason, audit record, authorization, success/failure state, and rollback or support path where applicable. No fabricated counts, dates, rati`
- `49: Compile all controller routes and compare them method-by-method with consumer calls. Trace each workflow through DTO validation, guards, role normalization, ownership/BOLA checks, services, schemas, transactions, queues, storage, notificati`
- `51: Review consent scope, QR verifier, emergency location policy, unified error-code registry, WebSocket origin and participant authorization, LiveKit session ownership, chat membership, notification ownership, file access, storage expiry, paym`
### state_transitions
- `9: Every feature is audited through the same complete chain: discovery/list → detail/profile → eligibility and prerequisites → beneficiary/family → mode and location → provider/slot availability → clinical context and consent → attachments → c`
- `11: For each node we verify the visible screen, every CTA/icon, enabled/disabled logic, loading/empty/error/retry state, navigation escape route, API method/path, schema, database transition, ownership, notification, localization, accessibility`
- `21: Cover doctor search/filter, specialty, profile, services, ratings, real availability, holidays, blocked periods, existing bookings, split shifts, timezone, instant versus scheduled slots, clinic versus home versus online, cash versus card/w`
- `25: Cover catalog/search/drug index, prescription-required versus OTC, medicine detail, quantity, stock, alternatives, prescription upload/OCR, delivery versus pickup, address, cash/card/insurance/wallet, partial insurance approval per item, ca`
- `29: Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imagi`
- `33: Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating,`
- `37: Review registration and KYC, provider type and effective roles, profile, photo, clinic/facility identity, services, prices, cash/insurance configuration, coverage policies, availability, working days, holidays, split shifts, blocked slots, `
- `39: For operations, review inbox, queue, broadcast, search/filter, patient/order details, insurance information under minimum-necessary access, accept/reject/reassign with reasons, slot confirmation, appointment list, reminders, chat, video/voi`
- `43: Keep existing screens and verify them against real contracts. Add or identify gaps in command center, providers, facilities, staff, patients, orders, bookings, pharmacy, labs, radiology, nursing, catalogs, medicine/drug index, insurance com`
- `45: Every dashboard metric must have a real source and time range. Every action must show confirmation, reason, audit record, authorization, success/failure state, and rollback or support path where applicable. No fabricated counts, dates, rati`
- `49: Compile all controller routes and compare them method-by-method with consumer calls. Trace each workflow through DTO validation, guards, role normalization, ownership/BOLA checks, services, schemas, transactions, queues, storage, notificati`
- `51: Review consent scope, QR verifier, emergency location policy, unified error-code registry, WebSocket origin and participant authorization, LiveKit session ownership, chat membership, notification ownership, file access, storage expiry, paym`
### payment_insurance_relevance
- `5: All work uses `obaid08642-ops/new`, branch `manus/on-live-reconciliation`, and the four committed application artifacts: Backend, Patient, Provider, and Admin. No old fix branch or unrelated repository is an implementation base. Every resul`
- `9: Every feature is audited through the same complete chain: discovery/list → detail/profile → eligibility and prerequisites → beneficiary/family → mode and location → provider/slot availability → clinical context and consent → attachments → c`
- `17: Review onboarding, login, OTP/2FA, guest mode, session expiry, profile, language/device detection, RTL/LTR, light/dark system theme and manual override, permissions, addresses, family members, health records, allergies, chronic conditions, `
- `21: Cover doctor search/filter, specialty, profile, services, ratings, real availability, holidays, blocked periods, existing bookings, split shifts, timezone, instant versus scheduled slots, clinic versus home versus online, cash versus card/w`
- `25: Cover catalog/search/drug index, prescription-required versus OTC, medicine detail, quantity, stock, alternatives, prescription upload/OCR, delivery versus pickup, address, cash/card/insurance/wallet, partial insurance approval per item, ca`
- `29: Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imagi`
- `33: Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating,`
- `37: Review registration and KYC, provider type and effective roles, profile, photo, clinic/facility identity, services, prices, cash/insurance configuration, coverage policies, availability, working days, holidays, split shifts, blocked slots, `
- `39: For operations, review inbox, queue, broadcast, search/filter, patient/order details, insurance information under minimum-necessary access, accept/reject/reassign with reasons, slot confirmation, appointment list, reminders, chat, video/voi`
- `43: Keep existing screens and verify them against real contracts. Add or identify gaps in command center, providers, facilities, staff, patients, orders, bookings, pharmacy, labs, radiology, nursing, catalogs, medicine/drug index, insurance com`
- `49: Compile all controller routes and compare them method-by-method with consumer calls. Trace each workflow through DTO validation, guards, role normalization, ownership/BOLA checks, services, schemas, transactions, queues, storage, notificati`
- `51: Review consent scope, QR verifier, emergency location policy, unified error-code registry, WebSocket origin and participant authorization, LiveKit session ownership, chat membership, notification ownership, file access, storage expiry, paym`
### error_empty_loading_retry_cancel
- `9: Every feature is audited through the same complete chain: discovery/list → detail/profile → eligibility and prerequisites → beneficiary/family → mode and location → provider/slot availability → clinical context and consent → attachments → c`
- `11: For each node we verify the visible screen, every CTA/icon, enabled/disabled logic, loading/empty/error/retry state, navigation escape route, API method/path, schema, database transition, ownership, notification, localization, accessibility`
- `21: Cover doctor search/filter, specialty, profile, services, ratings, real availability, holidays, blocked periods, existing bookings, split shifts, timezone, instant versus scheduled slots, clinic versus home versus online, cash versus card/w`
- `25: Cover catalog/search/drug index, prescription-required versus OTC, medicine detail, quantity, stock, alternatives, prescription upload/OCR, delivery versus pickup, address, cash/card/insurance/wallet, partial insurance approval per item, ca`
- `29: Cover test/package or modality selection, branch versus home where supported, slot and address, preparation instructions, cash/insurance/copay, approval workflow, provider intake, sample/appointment states, collected/analyzing/result, imagi`
- `33: Cover service/package/caregiver selection, home address and location permissions, availability, urgent versus scheduled, cash/insurance, provider broadcast/acceptance, arrival, GPS tracking, start/notes/tasks, signature, completion, rating,`
- `39: For operations, review inbox, queue, broadcast, search/filter, patient/order details, insurance information under minimum-necessary access, accept/reject/reassign with reasons, slot confirmation, appointment list, reminders, chat, video/voi`
- `51: Review consent scope, QR verifier, emergency location policy, unified error-code registry, WebSocket origin and participant authorization, LiveKit session ownership, chat membership, notification ownership, file access, storage expiry, paym`
- `55: For each screen, ask whether the user can understand the current state, the next action, the price/coverage, the responsible actor, the expected time, and the recovery path. If a user logically needs a booking button, confirmation screen, p`
- `57: Scan and manually verify placeholders, mock/fake/demo/sample data, hardcoded business defaults, fabricated reviews/ratings, synthetic IDs, local success toasts, stale routes, dead buttons, inconsistent labels, clipped text, RTL/LTR issues, `
- `61: First perform source inventory and contract reconciliation. Then run typecheck, unit tests, boot tests, production builds, Expo exports/prebuilds, and Admin builds from the extracted artifacts. Next execute sandbox-only E2E by service and a`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
