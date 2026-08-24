# Phase 0B semantic evidence — medicine.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/medicine.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and Medicine/MedicineDocument. Lines 8–13 define an injectable `MedicineRepository` extending `MongoRepository<MedicineDocument>` and pass the named Medicine model to the superclass.

**Behavioral scope:** No custom medicine lookup, public/active/approved filtering, pharmacy/provider ownership, stock/reservation, price/currency, expiry/batch, prescription/controlled-drug policy, projection, transaction or audit behavior is implemented here. All semantics are delegated to callers/schema/database.

**Integrity/clinical implications:** Generic CRUD around medicines does not itself ensure authoritative catalog data, safe prescription restrictions, valid stock/expiry, correct pharmacy tenancy, or preservation of order-time price/medicine snapshots. Broad inherited queries could expose private medicine/provider fields if callers omit projections.

**Test implications:** verify model token resolution, public/active filtering, pharmacy/provider ownership, stock and batch/expiry rules, price/currency invariants, prescription/controlled-drug authorization, projection/redaction, concurrent reservation/replay and audit linkage. No tests executed during this semantic read.
