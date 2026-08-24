# Phase 0B semantic evidence — provider-requests.doctor-contract.spec.ts

**Archive member:** `src/modules/provider/provider-requests.doctor-contract.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–52; full 52-line member covered.

Lines 2–16 construct `ProviderRequestsController` with mocked service, repository, event emitter, Mongo connection and patient profile dependencies. The default request includes provider ownership, patient identity, payload, in-progress status and amount.

Lines 18–22 verify `getOrders` returns prescriptions/labs from an owned request and delegates detail lookup with the authenticated user and request ID. Lines 24–29 verify `endConsultation` rejects an `accepted` request before repository update or completion call. Lines 31–41 verify an in-progress consultation writes clinical orders through a filter containing request ID and `provider_account_id`, invokes canonical completion with user/request, emits `medical_orders.emitted`, and returns completed state. Lines 43–46 verify a supplied foreign patient ID is rejected when issuing a medical report. Lines 48–51 verify an insurance decision is rejected when a verified patient insurance policy is absent.

**What is proven:** unit-level owned request filtering for the tested completion path, state precondition for ending consultation, clinical-order event emission, server-owned patient mismatch rejection, and dependency on verified insurance before a decision.

**What is not proven:** HTTP guards, unauthenticated/stranger/provider-role matrix, tenant isolation, request detail behavior for missing/foreign requests, DTO schema/size/content validation, idempotency/replay, concurrent completion, CAS/transactions, event retry/outbox, audit failure, actual insurance eligibility/approval or payment settlement, report storage/privacy, and complete status-transition map. All collaborators are mocks, so database/index behavior and controller wiring are unverified.

**Truthfulness/financial:** test fixtures use hard-coded patient name and amount; they test control flow only, not source-of-truth correctness of clinical findings, prices, insurance decision or payment.

**Test implications:** add integration tests for owner/stranger/unauth, role/tenant boundaries, malformed payloads, duplicate/replayed completion, concurrent state changes, event failure/retry, report access, verified-policy semantics and financial settlement. No tests executed during this semantic read.
