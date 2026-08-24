# Phase 0B semantic evidence — drugrejectionlog.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/drugrejectionlog.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and DrugRejectionLog/DrugRejectionLogDocument from the shared schema. Lines 8–13 define an injectable `DrugRejectionLogRepository` extending `MongoRepository<DrugRejectionLogDocument>` and pass the named model to the superclass.

**Behavioral scope:** No custom medicine/order/pharmacy ownership, rejection-type allowlist, date-window semantics, append-only enforcement, duplicate suppression, actor binding, projection, transaction, idempotency or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Integrity implications:** Generic rejection-log CRUD does not itself ensure a rejection belongs to the correct order/medicine/pharmacy, cannot be edited or deleted after threshold evaluation, and cannot be replayed or duplicated to manipulate shortage metrics. Concurrent writes can also distort threshold counts unless unique keys or atomic aggregation are used.

**Test implications:** verify model/collection mapping, order/medicine/pharmacy scope, rejection type/date-window validation, append-only policy, duplicate/replay handling, concurrency, actor attribution, safe projection and audit integrity. No tests executed during this semantic read.
