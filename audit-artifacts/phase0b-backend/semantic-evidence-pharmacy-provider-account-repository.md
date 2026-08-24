# Phase 0B semantic evidence — provideraccount.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/provideraccount.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderAccount from the Provider schemas. Lines 8–13 define an injectable `ProviderAccountRepository` extending `MongoRepository<ProviderAccount>` and pass the named ProviderAccount model to the superclass.

**Behavioral scope:** No custom email/phone lookup, password projection, provider/pharmacy tenant ownership, active/approved filtering, lock/revocation, session invalidation, transaction, audit or idempotency behavior is implemented here. All semantics are inherited or delegated to callers.

**Security implications:** Generic account CRUD does not itself prevent password_hash/PII exposure, cross-provider reads/writes, status bypass, or updates to authentication-sensitive fields. ProviderAccount is a high-impact identity model, so consumers must use allowlisted updates and strict projections.

**Test implications:** verify model/collection mapping, password/secret redaction, provider tenant scope, lifecycle/status authorization, lock/session revocation, safe field allowlists, audit linkage and concurrent update behavior. No tests executed during this semantic read.
