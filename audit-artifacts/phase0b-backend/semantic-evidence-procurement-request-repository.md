# Phase 0B semantic evidence — procurementrequest.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/procurementrequest.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProcurementRequest/ProcurementRequestDocument from the Pharmacy procurement schema. Lines 8–13 define an injectable `ProcurementRequestRepository` extending `MongoRepository<ProcurementRequestDocument>` and pass the named ProcurementRequest model to the superclass.

**Behavioral scope:** No custom pharmacy/admin/warehouse ownership, status-transition CAS, quotation linkage, request-item validation, attachment safety, expiry/deadline, projection, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity/security implications:** Generic procurement-request CRUD does not itself prevent cross-pharmacy reads/writes, unauthorized admin review, mutation of terminal requests, orphan quotations, duplicate submissions, or exposure of shortage lists and uploaded-file URLs. The controller/service must enforce principal binding, transition matrix and exact-once behavior.

**Test implications:** verify model/collection mapping, pharmacy/admin/warehouse scope, item and attachment rules, status CAS/expiry, quotation relationship, duplicate/replay handling, transaction/outbox, safe projection and audit linkage. No tests executed during this semantic read.
