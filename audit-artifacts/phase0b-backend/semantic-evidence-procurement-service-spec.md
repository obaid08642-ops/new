# Phase 0B semantic evidence — procurement.service.spec.ts

**Archive member:** `src/modules/pharmacy/tests/procurement.service.spec.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–184; full member covered.

Lines 1–10 import Nest/Jest utilities, exceptions and ProcurementStatus, and define fixed pharmacy/user/request IDs. Lines 12–25 provide hand-built request/document factories with mocked save methods. Lines 30–44 define mock repository methods. Lines 46–58 construct ProcurementService with repository mocks and clear mock state.

Lines 60–73 test createRequest: a request is created with PENDING_ADMIN_REVIEW and the repository create call contains that status. The test does not verify nonempty/unique items, normalization, catalog existence, requester binding, pharmacy ownership, idempotency, or duplicate submission behavior.

Lines 75–83 test getPharmacyRequests: one pharmacy filter returns one request. It does not test authenticated identity, stranger/tenant isolation, pagination, sorting stability, deleted/hidden records or data minimization.

Lines 85–106 test adminStartReview: an existing pending request remains/enters PENDING_ADMIN_REVIEW; missing request is NotFound; wrong source status is BadRequest. There is no admin role/tenant authorization, CAS/atomic transition, concurrent review or audit attribution.

Lines 108–129 test adminCreateQuotation: a pending request creates a quotation, updates request to QUOTATION_ISSUED and saves; missing request throws NotFound. The DTO passed in includes client prices and totalPrice, but the spec does not assert server-side recomputation, currency/rounding, medicine/catalog verification, quotation expiry, duplicate deletion safety, transactionality, admin ownership, or idempotency/replay. `deleteMany` is mocked without assertions about scope or failure behavior.

Lines 131–151 test submitPharmacyFeedback: quotation-issued request can be approved and feedback saved; a pending request is rejected. There is no explicit cancel path, pharmacy owner/stranger/unauth/role test, quotation expiry, terminal-state/CAS, concurrent approve/cancel, replay/idempotency, feedback bounds or quotation-to-pharmacy linkage assertion.

Lines 153–167 test adminCancelRequest: pending request becomes CANCELLED; completed request cannot be cancelled. No admin authorization, source-state matrix, atomic update, cancellation reason/audit, race or replay coverage.

Lines 169–183 test adminCompleteRequest: approved request becomes COMPLETED; non-approved request is rejected. No payment/inventory truthfulness, fulfillment evidence, idempotency, authorization, concurrency or durable transaction coverage.

**Coverage judgment:** The spec documents core happy-path state transitions and a small set of invalid source states. It is entirely repository-mock/unit oriented and does not establish the contract’s required owner/stranger/unauth behavior or exact-once semantics.

**Findings:** Passing tests can coexist with BOLA/IDOR if controller/service authorization is outside this suite; with financial truthfulness defects because client total/prices are not challenged; with duplicate quotations or conflicting terminal transitions because in-memory save is not a conditional atomic persistence operation; and with replay because no idempotency key or duplicate-call test exists.

No product code was changed and no tests were executed during this semantic read.
