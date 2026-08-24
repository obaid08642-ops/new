# Phase 0B semantic evidence — radiologybooking.repository.ts

**Archive member:** `src/modules/radiology/repositories/radiologybooking.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, the generic `MongoRepository`, and the shared `RadiologyBooking` schema type. Lines 8–13 define `RadiologyBookingRepository` as a thin subclass of `MongoRepository<RadiologyBooking>` and pass the injected model to the base constructor.

**Semantic behavior:** no booking-specific query methods, public UUID scoping, patient/provider predicates, state filters, transaction/session handling, CAS/versioning, projections, pagination, soft delete, artifact filtering, or error mapping are visible. Effective behavior is inherited from `MongoRepository` and consumers.

**Security/ownership:** this member itself provides no patient/center/provider ownership, tenant isolation, authorization, immutable-field, or report confidentiality policy. It is not evidence that Radiology booking access is safely scoped.

**Truthfulness/financial source:** no pricing, payment, insurance, workflow, report or transformation logic visible.

**Test implications:** verify inherited and consumer behavior for public UUID vs internal ID, patient/center/provider scoping, state CAS/transactions, artifact/PII projections, soft deletes, and error semantics. No tests executed during this semantic read.
