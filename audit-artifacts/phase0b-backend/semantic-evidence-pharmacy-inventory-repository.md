# Phase 0B semantic evidence — pharmacyinventoryitem.repository.ts

**Archive member:** `src/modules/provider/services/repositories/pharmacyinventoryitem.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and PharmacyInventoryItem. Lines 8–13 define an injectable repository extending `MongoRepository<PharmacyInventoryItem>` and pass the named model to the superclass.

**Behavioral scope:** No custom pharmacy/provider ownership, active/catalog visibility, stock quantity, reservation/decrement, price/currency, expiry/batch, SKU uniqueness, idempotency, transaction, projection or audit behavior is implemented here. All semantics are delegated to callers/schema/database.

**Financial/inventory implications:** Generic CRUD does not ensure server-authoritative prices, nonnegative stock, atomic reservation, duplicate prevention, batch expiry handling, or preservation of order-time price snapshots. A read-then-write consumer could oversell or expose stale inventory.

**Test implications:** verify model token resolution, pharmacy/tenant ownership, active/public projection, stock CAS/reservation, SKU/batch/expiry uniqueness, price/currency invariants, concurrent checkout/replay and audit linkage. No tests executed during this semantic read.
