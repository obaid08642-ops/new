# Phase 0B semantic evidence — orders medicine.repository.ts

**Archive member:** `src/modules/orders/repositories/medicine.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and Medicine/MedicineDocument from the shared medicine schema. Lines 8–13 define an injectable `MedicineRepository` extending `MongoRepository<MedicineDocument>` and pass the named Medicine model to the superclass.

**Behavioral scope:** No custom public/active filtering, pharmacy/provider ownership, prescription/controlled-drug policy, price/currency, stock/expiry, projection, transaction or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity/clinical implications:** The Orders-domain wrapper may read/write medicine records without itself proving catalog approval, pharmacy tenancy, prescription restrictions, safe fields or order-time snapshot consistency. Its shared model mapping must be reconciled with the Pharmacy medicine repository to avoid divergent consumers.

**Test implications:** verify model/collection identity, active/public projection, pharmacy ownership, prescription authorization, stock/batch/expiry, price/currency, immutable order snapshots and least-privilege reads. No tests executed during this semantic read.
