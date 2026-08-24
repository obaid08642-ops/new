# Phase 0B semantic evidence — pharmacyallocation.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/pharmacyallocation.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyAllocation from the Pharmacy schema. Lines 8–13 define an injectable `PharmacyAllocationRepository` extending `MongoRepository<PharmacyAllocation>` and pass the named PharmacyAllocation model to the superclass.

**Behavioral scope:** No custom order/provider/pharmacy ownership, one-allocation uniqueness, assignment state transition, acceptance/expiry, compare-and-set, conflict resolution, transaction, idempotency, projection or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity implications:** Generic allocation CRUD does not itself ensure a single pharmacy owns an order, prevent conflicting allocations, reject stale acceptance, or stop replayed assignment/cancellation effects. It also does not prove the allocation is tied to the authenticated pharmacy or intended order tenant.

**Test implications:** verify model/collection mapping, order/provider/pharmacy scope, one-active-allocation uniqueness, state CAS/expiry, concurrent assignment, replay/idempotency, cancellation compensation, projections and audit linkage. No tests executed during this semantic read.
