# Phase 8 — post-AE source-remediation inventory

## Doctor dashboard: confirmed source findings

| Finding | Evidence | Risk | Required remediation direction |
|---|---|---|---|
| Fabricated financial fallback | `DoctorWalletTab` replaces a failed wallet/transaction response with fixed balances and dated credit/debit entries. | A provider may see invented balances and transaction history during an outage. | Fail closed with an explicit retry/error state; never substitute server finance data. |
| Fabricated clinical chat list | `DoctorChatTab` substitutes three named patients, message summaries and unread counts when chat retrieval fails. | PHI-like synthetic identities can be mistaken for real care records and conceal an integration failure. | Render an error/retry state only; retain no synthetic chat fixtures in the operational screen. |
| Non-durable chat delivery | The chat screen appends a locally generated message before the mutation and ignores a failed request. | The clinician can be shown a sent message that the patient never receives. | Use acknowledged server response or reversible optimistic state, with explicit failed/retry state and no local terminal assertion. |
| Placeholder video action | The video button emits only a local “starting” toast. | It claims progress without creating an authorized LiveKit/call session. | Remove/contain until the verified call flow is wired; do not imply a connection. |
| Local no-show configuration and records | No-show fee/toggle fields, named records and save success are locally stateful. | Clinical/financial scheduling settings can appear applied with no server mutation. | Replace with typed server read/write contract or mark unavailable; no fixed recent cases. |

## Doctor insurance, reporting and calendar: confirmed source findings

| Finding | Evidence | Risk | Required remediation direction |
|---|---|---|---|
| Client-fabricated insurance claim | `InsuranceClaimScreen` chooses from fixed insurer/plan lists, creates random policy/member IDs, sets `APPROVED`, and derives coverage/cost shares in the client before posting. | A provider can submit invented eligibility, approval and financial values. | Remove the submission path until the server-owned eligibility/approval contract supplies the real policy and financial decision. |
| Unverified report/QR assertion | `MedicalReportScreen` declares that each medical report is digitally signed with a Ministry-verified QR despite the owner-approved QR contract remaining fail-closed. | A high-trust clinical document may be misrepresented as legally verified. | Preserve only server-confirmed report issuance and remove the QR/Ministry assertion unless a verified contract explicitly returns it. |
| Local calendar integration | `CalendarSyncScreen` toggles Google/Apple connection, reminder and auto-add state locally, then declares connection and save success. | It implies OAuth/calendar synchronization and PHI export without an integration or consent contract. | Fail closed and offer no connection/saved state until an authorized integration is implemented. |

## Doctor consultation and inbound clinical records: confirmed source findings

| Finding | Evidence | Risk | Required remediation direction |
|---|---|---|---|
| Pre-visit chat fixture | `PreVisitChatScreen` initializes a named, attachment-bearing patient message and locally appends the doctor message after an unverified generic endpoint call. | A clinician can view or create a fictional medical conversation/attachment. | Replace the fixture with an empty/error state and route messaging only through the authenticated appointment/thread contract. |
| Simulated inbound reports | `InboundMedicalReportsScreen` runs a timeout and inserts named radiology/lab records with `example.com` PDF/DICOM URLs. | The operational EHR surface can expose fictional clinical results and external links. | Remove the simulated fetch and keep an explicit unavailable/retry state until an owned, private report-list endpoint exists. |
| Premature waiting-room terminal claims | `pingPatient` and `markNoShow` present success after `fetch()` without checking an HTTP response body/status. | The UI can claim a notification/no-show transition when the backend rejected the request. | Require a successful server response before success/reload and retain error state otherwise. |

## Backend doctor-request contract: confirmed source findings

| Finding | Evidence | Risk | Required remediation direction |
|---|---|---|---|
| Orders endpoint lacks actor boundary | `GET /provider/requests/:id/orders` reads directly from the repository without `@CurrentUser()` or `ProviderRequestEngineService.detail()`. | An unauthenticated or unrelated caller could discover prescription/lab payloads for a request ID. | Require the authenticated provider and reuse the engine’s owned-detail check before returning orders. |
| Consultation-end bypasses workflow/ownership | `POST /provider/requests/:id/end` loads a request by ID, directly overwrites status/payload, logs fake “atomic” steps, and emits an event without validating the authenticated provider or transition. | An unrelated provider can mutate care data and the audit/status pipeline is bypassed. | Load through the owned request service; require legal in-progress state and use canonical completion semantics before storing clinical orders. |
| Medical report issuance lacks appointment ownership | `POST /provider/requests/:id/medical-report` validates only caller-provided patient/findings and inserts a report with no owned-request/patient linkage check. | A provider could issue a report to an unrelated patient/request. | Resolve the owned provider request, derive the patient server-side, reject mismatched body IDs, and retain only server-generated tracking metadata. |
| Unsafe insurance decision fallback | The insurance-copay path permits an `unknown` policy fallback when no patient policy exists, while the current client submits random policy identifiers and a pre-approved decision. | An insurance record can be created from unverifiable policy/financial input. | Require a real patient policy plus a server-owned pending insurance request before a provider can decide; keep the current client screen fail-closed pending this contract. |

## Status

The findings above are source-level observations only. No production or sandbox record was read, created or changed. `ProviderRequestEngineService.detail()` already provides the canonical `provider_account_id` ownership boundary, and its repository exposes `updateOne()` after that boundary has been enforced.

## Batch AF disposition

Batch AF remediated the wallet, post-consultation chat, pre-visit fixture, simulated inbound reports, arbitrary insurance screen, non-contract calendar/video assertions, waiting-room response handling, and the backend order/end/report/insurance ownership boundaries. The evidence is recorded in `NABDAH_PHASE8_BATCH_AF_DOCTOR_CLINICAL_RECORD_INTEGRITY_20260819.md`. Local no-show configuration/history, any future private inbound-report list, approved calendar/video integration, and reviewer-authorized sandbox acceptance remain separate bounded work; none is represented as live or complete.

## Admin governance: confirmed source findings

| Finding | Evidence | Risk | Required remediation direction |
|---|---|---|---|
| Client-selected emergency operator | `config-portal.tsx` submits the constant `admin-master-001`; `AdminGovernanceController` accepts `adminId` directly from the body and converts it to an object ID. | A browser can assert another operator identity for a system-wide emergency change. | Derive operator identity from the authenticated admin session and never accept it from the client. |
| Unguarded global mutations/readouts | The controller has no admin-role guard and its emergency trigger, fraud-alert and audit-log routes do not receive authenticated context. | Non-admin actors may invoke a global operation or read sensitive operational data if routing/auth assumptions drift. | Apply explicit central admin authorization and test denial paths. |
| Nonfunctional infrastructure claim | Redis handling is commented out, but the route declares that all services were interrupted/restored after only a database upsert. | The admin UI can claim a global safety-critical system state that was not executed. | Fail closed: remove browser control/terminal-success claim until an owner-approved, audited infrastructure command exists. |
| Direct browser SLA override | The portal posts global SLA/JWT values directly and reports success without checking the response body; no matching source controller was found in the route search. | Operators can be shown an applied global configuration that is unverified or unsupported. | Contain the client UI pending a typed, authorized configuration/audit contract. |

## Admin campaigns and notifications: confirmed source findings

| Finding | Evidence | Risk | Required remediation direction |
|---|---|---|---|
| Fixed actor attribution | `AdminNotificationCenterController` applies JWT/admin guards, but all broadcast/campaign service calls pass the literal actor `'admin'` instead of the authenticated operator identity. | Audit attribution and maker-checker control cannot identify the actual decision-maker. | Pass authenticated admin context into the service and retain immutable actor/audit metadata. |
| Broad audience/mutation without product guardrail | The client can target all users, role segments, a raw user ID, deep links and immediate retargeting. | PHI-adjacent outreach can be sent or scheduled without a documented review/audience/route validation boundary. | Require server allowlisted segments/deep links, clear audience confirmation, rate/idempotency/audit controls and an authorized review policy. |
| Success-only campaign actions | The page displays immediate “sent/scheduled/retarget run” assertions after generic calls, while send/cancel/retarget handlers do not inspect a response result. | The UI may report a campaign action as complete if the backend/network did not confirm it. | Require a typed acknowledged response and refresh only after it; otherwise retain an error/retry state. |

## Batch AG disposition

Batch AG added class-level admin role metadata to governance routes, removed the body-selected administrator identity, and changed the emergency-maintenance endpoint to reject without writing configuration until an owner-approved infrastructure command, immutable audit attribution, dual approval and verified recovery are implemented. The config portal now exposes an explicit unavailable state and no longer displays browser-controlled SLA or maintenance success. A prior Next build failure was isolated to a nonstandard inherited `NODE_ENV`; the clean production environment build completed all 34 static admin routes. Campaign governance, SOS administrative mutation containment, AI/PHI controls and source-of-truth RBAC remain separate bounded work.
