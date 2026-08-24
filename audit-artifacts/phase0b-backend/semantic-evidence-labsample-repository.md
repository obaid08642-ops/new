# Phase 0B semantic evidence — labsample.repository.ts

**Archive member:** `src/modules/labs/repositories/labsample.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, the generic `MongoRepository`, and the `LabSample` schema type. Lines 8–13 define `LabSampleRepository` as a thin subclass of `MongoRepository<LabSample>` and pass the injected `Model<LabSample>` to the base constructor.

**Semantic behavior:** no sample-specific methods, barcode uniqueness query, booking linkage, ownership predicate, status/stage filter, transaction/session handling, optimistic concurrency, projection, pagination, soft delete, or error mapping are visible. Effective behavior is inherited from `MongoRepository` and its consumers.

**Security/ownership:** this member itself provides no patient/lab/sample ownership, tenant isolation, authorization, or immutable barcode policy. It is not evidence that a sample cannot be accessed or changed by an unauthorized laboratory.

**Truthfulness/financial source:** no pricing, payment, insurance, result, or transformation logic visible.

**Test implications:** verify base repository and consumers for booking-scoped sample access, unique barcode enforcement under race, immutable identifiers, stage/state CAS, PII projection, soft deletes, transactions and error semantics. No tests executed during this semantic read.
