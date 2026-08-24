# Phase 0B semantic evidence — orders providerprofile.repository.ts

**Archive member:** `src/modules/orders/repositories/providerprofile.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderProfile/ProviderProfileDocument from the shared provider-profile schema. Lines 8–13 define an injectable `ProviderProfileRepository` extending `MongoRepository<ProviderProfileDocument>` and pass the named ProviderProfile model to the superclass.

**Behavioral scope:** No custom provider/account ownership, active/approved filtering, public projection/redaction, location validation, delivery eligibility, licensing, price/commission or tenant policy is implemented here. All semantics are delegated to callers/schema/database.

**Integrity/security implications:** Generic profile CRUD in the order path does not itself prevent cross-provider reads/writes or expose legal/tax/contact/location/commission fields to an inappropriate caller. Its model/collection identity must be reconciled with ProviderModule and DispatchService, which use similarly named but potentially different profile shapes/identifiers.

**Test implications:** verify model/collection mapping, provider tenant scope, active/approved/public projection, location/delivery eligibility, license state, dispatch identifier mapping and safe redaction. No tests executed during this semantic read.
