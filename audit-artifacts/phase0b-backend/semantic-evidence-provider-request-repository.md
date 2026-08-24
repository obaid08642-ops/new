# Phase 0B semantic evidence — providerrequest.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerrequest.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderRequest. Lines 8–13 define an injectable repository extending `MongoRepository<ProviderRequest>` and pass the named ProviderRequest model to the superclass.

**Behavioral scope:** No custom request/tenant/provider ownership predicate, patient PII projection, state-transition CAS, assignment winner, timeout, idempotency, pricing/source-of-truth, transaction, timeline immutability or audit policy is implemented here. All semantics are inherited or delegated to callers.

**Integrity implications:** ProviderRequest carries denormalized patient PII, arbitrary payload/match data, state/assignment fields and amount/currency. A generic repository does not ensure safe projections, legal state transitions, atomic assignment, replay protection or server-authoritative financial values. Broad inherited queries/writes could cross provider or patient boundaries if callers omit predicates.

**Test implications:** verify model token resolution, patient/provider/tenant scope, projection/redaction, transition CAS/versioning, assignment concurrency, timeout/replay/idempotency, pricing and currency invariants, timeline immutability and audit behavior. No tests executed during this semantic read.
