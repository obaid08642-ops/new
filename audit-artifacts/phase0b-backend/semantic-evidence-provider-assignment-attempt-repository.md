# Phase 0B semantic evidence — providerassignmentattempt.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerassignmentattempt.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderAssignmentAttempt. Lines 8–13 define an injectable repository extending `MongoRepository<ProviderAssignmentAttempt>` and pass the named model to the superclass.

**Behavioral scope:** No custom request/provider ownership predicate, attempt uniqueness, assignment state, timeout/expiry, ranking snapshot, retry policy, transaction, compare-and-set, idempotency or audit behavior is implemented. All semantics are delegated to callers/schema/database.

**Integrity implications:** Assignment attempts are concurrency-sensitive. Generic CRUD does not guarantee one effective attempt per request/provider, monotonic assignment state, timeout correctness, or atomic winner selection. Missing caller predicates could permit cross-provider/request reads or writes.

**Test implications:** verify model token resolution, request/provider tenancy, unique attempt keys, concurrent assignment winner behavior, timeout/retry semantics, replay/idempotency and append-only audit records. No tests executed during this semantic read.
