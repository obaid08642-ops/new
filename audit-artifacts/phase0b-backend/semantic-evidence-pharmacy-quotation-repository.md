# Phase 0B semantic evidence — quotation.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/quotation.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and Quotation from the Pharmacy quotation schema. Lines 8–13 define an injectable `QuotationRepository` extending `MongoRepository<Quotation>` and inject the model using the literal token `'Quotation'`.

**Behavioral scope:** No custom procurement-request/pharmacy ownership, quotation status transition, amount/currency/line validation, expiry/deadline, approval evidence, projection, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Wiring implication:** The literal token must be matched against PharmacyModule schema registration. The member itself does not prove that the token resolves to the intended collection or schema, so bootstrap/token mapping requires verification.

**Financial/security implications:** A generic quotation wrapper does not itself ensure a quotation belongs to the target request/pharmacy, is issued by an authorized admin, remains unmodified after acceptance, expires correctly, or cannot be replayed into duplicate order/payment effects. Amount/currency and server-authoritative pricing must be enforced above this layer.

**Test implications:** verify literal token registration/model mapping, request/pharmacy/admin ownership, typed line/amount/currency invariants, status CAS, expiry, immutable acceptance, replay/idempotency, projection and audit linkage. No tests executed during this semantic read.
