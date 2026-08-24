# Phase 0B semantic evidence — providerprofile.repository.ts

**Archive member:** `src/modules/providers/repositories/providerprofile.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared `MongoRepository`, and ProviderProfile/ProviderProfileDocument. Lines 8–13 define an injectable `ProviderProfileRepository` extending `MongoRepository<ProviderProfileDocument>` and pass the injected `ProviderProfile` model to the superclass.

**Behavioral scope:** No custom profile lookup, update, ownership predicate, projection, tenant key, status filter, transaction, versioning, audit, or redaction behavior is defined. All semantics are inherited or supplied by callers.

**Integrity/security implications:** Because ProviderProfile is a public discovery and enterprise-parent model, generic inherited CRUD can permit broad reads or writes if a caller omits provider/tenant/status predicates. The repository itself does not enforce active/approved profile visibility or protect private fields.

**Test implications:** verify exact model/token resolution, inherited method behavior, approved/active/public projection, provider/tenant ownership filters, optimistic concurrency and prevention of unrestricted profile mutations. No tests executed during this semantic read.
