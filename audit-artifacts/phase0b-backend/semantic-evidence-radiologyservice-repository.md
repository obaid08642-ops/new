# Phase 0B semantic evidence — radiologyservice.repository.ts

**Archive member:** `src/modules/radiology/repositories/radiologyservice.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest Mongoose, `Model`, the generic `MongoRepository`, and the shared `RadiologyService` schema type. Lines 8–13 define `RadiologyServiceRepository` as a thin subclass of `MongoRepository<RadiologyService>` and pass the injected model to the base constructor.

**Semantic behavior:** no catalog-specific methods, public eligibility/medical approval filters, provider scoping, `_id`/short-code lookup policy, pagination, sorting, soft delete, versioning, or error mapping are visible. Effective behavior is inherited from `MongoRepository` and consumers.

**Security/ownership:** this member itself provides no provider/center ownership, tenant isolation, authorization, publication/approval, or immutable catalog policy. The public list/detail filters observed in `radiology.service.ts` are consumer-level behavior, not repository guarantees.

**Truthfulness/financial source:** no modality, pricing, insurance, or catalog transformation logic visible.

**Test implications:** verify inherited and consumer behavior for approved/public filtering, tenant/provider scoping, soft-delete exclusion, catalog identity, pagination, versioning, and error semantics. No tests executed during this semantic read.
