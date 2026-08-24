# Phase 0B semantic evidence — drugshortageflag.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/drugshortageflag.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and DrugShortageFlag from the Pharmacy schema. Lines 8–13 define an injectable `DrugShortageFlagRepository` extending `MongoRepository<DrugShortageFlag>` and pass the named DrugShortageFlag model to the superclass.

**Behavioral scope:** No custom medicine/pharmacy ownership, status transition, threshold/date-window, duplicate suppression, active/expiry, actor/admin authorization, projection, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity implications:** Generic CRUD for shortage flags does not itself guarantee one authoritative flag per medicine/pharmacy, valid status changes, correct time-window aggregation, or protection from cross-pharmacy reads/writes. Replayed or concurrent writes can create contradictory shortage state unless consumers use conditional updates and unique keys.

**Test implications:** verify model/collection mapping, medicine/pharmacy/tenant ownership, status allowlist and date-window semantics, unique active flag, concurrent CAS, replay/idempotency, admin actor attribution, redaction and audit linkage. No tests executed during this semantic read.
