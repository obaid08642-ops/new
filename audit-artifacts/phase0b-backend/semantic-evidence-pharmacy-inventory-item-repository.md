# Phase 0B semantic evidence — pharmacyinventoryitem.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/pharmacyinventoryitem.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyInventoryItem from the Provider capability schema. Lines 8–13 define an injectable `PharmacyInventoryItemRepository` extending `MongoRepository<PharmacyInventoryItem>` and pass the named PharmacyInventoryItem model to the superclass.

**Behavioral scope:** No custom pharmacy/provider ownership, SKU/medicine uniqueness, active/published state, stock reservation/decrement, batch/expiry, price/currency, availability, projection, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Cross-domain mapping implication:** This is a Pharmacy repository backed by a Provider capability schema. It must be reconciled with the Orders-domain PharmacyInventory repository and the Pharmacy medicine/inventory models to ensure consumers do not use divergent collections or field contracts.

**Integrity implications:** Generic inventory-item CRUD does not itself prevent cross-pharmacy access, duplicate SKU/medicine rows, negative or oversold stock, expired batches, stale prices, or unsafe public exposure.

**Test implications:** verify model/collection mapping, pharmacy/provider scope, SKU/medicine uniqueness, active state, batch/expiry, price/currency, atomic reservation/CAS, replay/idempotency and safe projection. No tests executed during this semantic read.
