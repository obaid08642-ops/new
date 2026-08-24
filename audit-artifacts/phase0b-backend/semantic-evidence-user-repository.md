# Phase 0B semantic evidence — user.repository.ts

**Archive member:** `src/modules/providers/repositories/user.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared `MongoRepository`, and User/UserDocument. Lines 8–13 define an injectable `UserRepository` extending `MongoRepository<UserDocument>` and pass the injected User model to the superclass.

**Behavioral scope:** This member adds no custom query, projection, ownership, tenant, soft-delete, PII redaction, validation, transaction, or audit behavior. All inherited repository semantics and all security policy are delegated to `MongoRepository` and callers. The repository is bound to the User model through `@InjectModel(User.name)`.

**Integrity risk:** A generic repository abstraction can expose broad CRUD/query behavior to consumers. The safety of user lookups therefore depends on caller filters and inherited methods; this wrapper itself does not enforce least-privilege projections or prevent unrestricted user reads.

**Test implications:** verify exact User model token resolution, inherited CRUD behavior, projection/redaction for provider consumers, tenant/ownership predicates at service level, and prevention of broad PII queries. No tests executed during this semantic read.
