# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/NABDAH_PHASE8_POST_AE_REMEDIATION_INVENTORY_20260819.md`
- **Member SHA-256:** `9121f6a17608a7ca9b0ae1504fb92158fa9786ea0d251b87a2a194339f0a46a4`
- **Line count:** 81
- **Read range:** `1-81`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: | Fabricated financial fallback | `DoctorWalletTab` replaces a failed wallet/transaction response with fixed balances and dated credit/debit entries. | A provider may see invented balances and transaction history during an outage. | Fail cl`
- `8: | Fabricated clinical chat list | `DoctorChatTab` substitutes three named patients, message summaries and unread counts when chat retrieval fails. | PHI-like synthetic identities can be mistaken for real care records and conceal an integrat`
- `9: | Non-durable chat delivery | The chat screen appends a locally generated message before the mutation and ignores a failed request. | The clinician can be shown a sent message that the patient never receives. | Use acknowledged server respo`
- `17: | Client-fabricated insurance claim | `InsuranceClaimScreen` chooses from fixed insurer/plan lists, creates random policy/member IDs, sets `APPROVED`, and derives coverage/cost shares in the client before posting. | A provider can submit in`
- `18: | Unverified report/QR assertion | `MedicalReportScreen` declares that each medical report is digitally signed with a Ministry-verified QR despite the owner-approved QR contract remaining fail-closed. | A high-trust clinical document may be`
- `19: | Local calendar integration | `CalendarSyncScreen` toggles Google/Apple connection, reminder and auto-add state locally, then declares connection and save success. | It implies OAuth/calendar synchronization and PHI export without an integ`
- `25: | Pre-visit chat fixture | `PreVisitChatScreen` initializes a named, attachment-bearing patient message and locally appends the doctor message after an unverified generic endpoint call. | A clinician can view or create a fictional medical c`
- `26: | Simulated inbound reports | `InboundMedicalReportsScreen` runs a timeout and inserts named radiology/lab records with `example.com` PDF/DICOM URLs. | The operational EHR surface can expose fictional clinical results and external links. | `
- `36: | Unsafe insurance decision fallback | The insurance-copay path permits an `unknown` policy fallback when no patient policy exists, while the current client submits random policy identifiers and a pre-approved decision. | An insurance recor`
- `44: Batch AF remediated the wallet, post-consultation chat, pre-visit fixture, simulated inbound reports, arbitrary insurance screen, non-contract calendar/video assertions, waiting-room response handling, and the backend order/end/report/insur`
- `50: | Client-selected emergency operator | `config-portal.tsx` submits the constant `admin-master-001`; `AdminGovernanceController` accepts `adminId` directly from the body and converts it to an object ID. | A browser can assert another operato`
- `51: | Unguarded global mutations/readouts | The controller has no admin-role guard and its emergency trigger, fraud-alert and audit-log routes do not receive authenticated context. | Non-admin actors may invoke a global operation or read sensit`
### backend_consumers_or_contracts
- `27: | Premature waiting-room terminal claims | `pingPatient` and `markNoShow` present success after `fetch()` without checking an HTTP response body/status. | The UI can claim a notification/no-show transition when the backend rejected the requ`
- `33: | Orders endpoint lacks actor boundary | `GET /provider/requests/:id/orders` reads directly from the repository without `@CurrentUser()` or `ProviderRequestEngineService.detail()`. | An unauthenticated or unrelated caller could discover pre`
- `44: Batch AF remediated the wallet, post-consultation chat, pre-visit fixture, simulated inbound reports, arbitrary insurance screen, non-contract calendar/video assertions, waiting-room response handling, and the backend order/end/report/insur`
- `51: | Unguarded global mutations/readouts | The controller has no admin-role guard and its emergency trigger, fraud-alert and audit-log routes do not receive authenticated context. | Non-admin actors may invoke a global operation or read sensit`
### auth_ownership
- `10: | Placeholder video action | The video button emits only a local “starting” toast. | It claims progress without creating an authorized LiveKit/call session. | Remove/contain until the verified call flow is wired; do not imply a connection. `
- `18: | Unverified report/QR assertion | `MedicalReportScreen` declares that each medical report is digitally signed with a Ministry-verified QR despite the owner-approved QR contract remaining fail-closed. | A high-trust clinical document may be`
- `34: | Consultation-end bypasses workflow/ownership | `POST /provider/requests/:id/end` loads a request by ID, directly overwrites status/payload, logs fake “atomic” steps, and emits an event without validating the authenticated provider or tran`
- `35: | Medical report issuance lacks appointment ownership | `POST /provider/requests/:id/medical-report` validates only caller-provided patient/findings and inserts a report with no owned-request/patient linkage check. | A provider could issue `
- `40: The findings above are source-level observations only. No production or sandbox record was read, created or changed. `ProviderRequestEngineService.detail()` already provides the canonical `provider_account_id` ownership boundary, and its re`
- `44: Batch AF remediated the wallet, post-consultation chat, pre-visit fixture, simulated inbound reports, arbitrary insurance screen, non-contract calendar/video assertions, waiting-room response handling, and the backend order/end/report/insur`
- `46: ## Admin governance: confirmed source findings`
- `50: | Client-selected emergency operator | `config-portal.tsx` submits the constant `admin-master-001`; `AdminGovernanceController` accepts `adminId` directly from the body and converts it to an object ID. | A browser can assert another operato`
- `51: | Unguarded global mutations/readouts | The controller has no admin-role guard and its emergency trigger, fraud-alert and audit-log routes do not receive authenticated context. | Non-admin actors may invoke a global operation or read sensit`
- `52: | Nonfunctional infrastructure claim | Redis handling is commented out, but the route declares that all services were interrupted/restored after only a database upsert. | The admin UI can claim a global safety-critical system state that was`
- `55: ## Admin campaigns and notifications: confirmed source findings`
- `59: | Fixed actor attribution | `AdminNotificationCenterController` applies JWT/admin guards, but all broadcast/campaign service calls pass the literal actor `'admin'` instead of the authenticated operator identity. | Audit attribution and make`
### state_transitions
- `3: ## Doctor dashboard: confirmed source findings`
- `7: | Fabricated financial fallback | `DoctorWalletTab` replaces a failed wallet/transaction response with fixed balances and dated credit/debit entries. | A provider may see invented balances and transaction history during an outage. | Fail cl`
- `8: | Fabricated clinical chat list | `DoctorChatTab` substitutes three named patients, message summaries and unread counts when chat retrieval fails. | PHI-like synthetic identities can be mistaken for real care records and conceal an integrat`
- `9: | Non-durable chat delivery | The chat screen appends a locally generated message before the mutation and ignores a failed request. | The clinician can be shown a sent message that the patient never receives. | Use acknowledged server respo`
- `11: | Local no-show configuration and records | No-show fee/toggle fields, named records and save success are locally stateful. | Clinical/financial scheduling settings can appear applied with no server mutation. | Replace with typed server rea`
- `13: ## Doctor insurance, reporting and calendar: confirmed source findings`
- `17: | Client-fabricated insurance claim | `InsuranceClaimScreen` chooses from fixed insurer/plan lists, creates random policy/member IDs, sets `APPROVED`, and derives coverage/cost shares in the client before posting. | A provider can submit in`
- `18: | Unverified report/QR assertion | `MedicalReportScreen` declares that each medical report is digitally signed with a Ministry-verified QR despite the owner-approved QR contract remaining fail-closed. | A high-trust clinical document may be`
- `19: | Local calendar integration | `CalendarSyncScreen` toggles Google/Apple connection, reminder and auto-add state locally, then declares connection and save success. | It implies OAuth/calendar synchronization and PHI export without an integ`
- `21: ## Doctor consultation and inbound clinical records: confirmed source findings`
- `25: | Pre-visit chat fixture | `PreVisitChatScreen` initializes a named, attachment-bearing patient message and locally appends the doctor message after an unverified generic endpoint call. | A clinician can view or create a fictional medical c`
- `26: | Simulated inbound reports | `InboundMedicalReportsScreen` runs a timeout and inserts named radiology/lab records with `example.com` PDF/DICOM URLs. | The operational EHR surface can expose fictional clinical results and external links. | `
### payment_insurance_relevance
- `7: | Fabricated financial fallback | `DoctorWalletTab` replaces a failed wallet/transaction response with fixed balances and dated credit/debit entries. | A provider may see invented balances and transaction history during an outage. | Fail cl`
- `13: ## Doctor insurance, reporting and calendar: confirmed source findings`
- `17: | Client-fabricated insurance claim | `InsuranceClaimScreen` chooses from fixed insurer/plan lists, creates random policy/member IDs, sets `APPROVED`, and derives coverage/cost shares in the client before posting. | A provider can submit in`
- `19: | Local calendar integration | `CalendarSyncScreen` toggles Google/Apple connection, reminder and auto-add state locally, then declares connection and save success. | It implies OAuth/calendar synchronization and PHI export without an integ`
- `33: | Orders endpoint lacks actor boundary | `GET /provider/requests/:id/orders` reads directly from the repository without `@CurrentUser()` or `ProviderRequestEngineService.detail()`. | An unauthenticated or unrelated caller could discover pre`
- `34: | Consultation-end bypasses workflow/ownership | `POST /provider/requests/:id/end` loads a request by ID, directly overwrites status/payload, logs fake “atomic” steps, and emits an event without validating the authenticated provider or tran`
- `36: | Unsafe insurance decision fallback | The insurance-copay path permits an `unknown` policy fallback when no patient policy exists, while the current client submits random policy identifiers and a pre-approved decision. | An insurance recor`
- `44: Batch AF remediated the wallet, post-consultation chat, pre-visit fixture, simulated inbound reports, arbitrary insurance screen, non-contract calendar/video assertions, waiting-room response handling, and the backend order/end/report/insur`
### error_empty_loading_retry_cancel
- `7: | Fabricated financial fallback | `DoctorWalletTab` replaces a failed wallet/transaction response with fixed balances and dated credit/debit entries. | A provider may see invented balances and transaction history during an outage. | Fail cl`
- `8: | Fabricated clinical chat list | `DoctorChatTab` substitutes three named patients, message summaries and unread counts when chat retrieval fails. | PHI-like synthetic identities can be mistaken for real care records and conceal an integrat`
- `9: | Non-durable chat delivery | The chat screen appends a locally generated message before the mutation and ignores a failed request. | The clinician can be shown a sent message that the patient never receives. | Use acknowledged server respo`
- `25: | Pre-visit chat fixture | `PreVisitChatScreen` initializes a named, attachment-bearing patient message and locally appends the doctor message after an unverified generic endpoint call. | A clinician can view or create a fictional medical c`
- `26: | Simulated inbound reports | `InboundMedicalReportsScreen` runs a timeout and inserts named radiology/lab records with `example.com` PDF/DICOM URLs. | The operational EHR surface can expose fictional clinical results and external links. | `
- `27: | Premature waiting-room terminal claims | `pingPatient` and `markNoShow` present success after `fetch()` without checking an HTTP response body/status. | The UI can claim a notification/no-show transition when the backend rejected the requ`
- `36: | Unsafe insurance decision fallback | The insurance-copay path permits an `unknown` policy fallback when no patient policy exists, while the current client submits random policy identifiers and a pre-approved decision. | An insurance recor`
- `53: | Direct browser SLA override | The portal posts global SLA/JWT values directly and reports success without checking the response body; no matching source controller was found in the route search. | Operators can be shown an applied global `
- `61: | Success-only campaign actions | The page displays immediate “sent/scheduled/retarget run” assertions after generic calls, while send/cancel/retarget handlers do not inspect a response result. | The UI may report a campaign action as compl`
- `69: Batch AH changes campaign/broadcast attribution from a fixed actor to the authenticated admin identity, requires audience confirmation for bulk outreach, validates allowed segment formats, target-user existence, message sizes, deep-link rou`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
