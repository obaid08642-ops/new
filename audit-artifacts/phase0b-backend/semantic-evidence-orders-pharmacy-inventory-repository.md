# Phase 0B semantic evidence — orders pharmacyinventory.repository.ts

**Archive member:** `src/modules/orders/repositories/pharmacyinventory.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyInventory/PharmacyInventoryDocument from the orders-domain schemas. Lines 8–13 define an injectable `PharmacyInventoryRepository` extending `MongoRepository<PharmacyInventoryDocument>` and pass the named PharmacyInventory model to the superclass.

**Behavioral scope:** No custom pharmacy/provider/tenant ownership predicate, public projection, stock reservation, conditional decrement, expiry/batch selection, SKU uniqueness, order linkage, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity implications:** A generic CRUD wrapper in the order path does not guarantee that inventory reads are scoped to the correct pharmacy, that stock cannot become negative, that concurrent checkouts reserve stock once, or that retries cannot double-decrement. Model/collection identity must also be reconciled with the similarly named provider capability inventory model.

**Test implications:** verify model/collection mapping, pharmacy ownership, active/expiry filtering, conditional stock CAS/reservation, exact-once order linkage, replay/idempotency, partial failure compensation and safe projections. No tests executed during this semantic read.
