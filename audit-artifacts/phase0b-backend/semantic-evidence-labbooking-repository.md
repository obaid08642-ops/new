# Phase 0B semantic evidence — labbooking.repository.ts

**Archive member:** `src/modules/labs/repositories/labbooking.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, the generic `MongoRepository`, and the `LabBooking` schema type. Lines 8–13 define `LabBookingRepository` as a thin subclass of `MongoRepository<LabBooking>` and pass the injected `Model<LabBooking>` to the base constructor.

**Semantic behavior:** no booking-specific methods, status filters, ownership predicates, transaction/session handling, optimistic concurrency, projections, pagination, soft delete, or error mapping are visible. Effective behavior is inherited from `MongoRepository` and consumers.

**Security/ownership:** this member itself provides no patient/lab ownership, tenant isolation, authorization, or immutable-field policy. It must not be treated as evidence that booking queries are safely scoped.

**Truthfulness/financial source:** no pricing, payment, insurance, workflow, or data transformation logic visible.

**Test implications:** verify base repository and every consumer for patient/lab scoping, state CAS/transactions, projection of PII and payment fields, soft deletes, error semantics, and model identity. No tests executed during this semantic read.
