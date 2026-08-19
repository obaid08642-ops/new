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
