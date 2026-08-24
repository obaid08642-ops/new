# Phase 0B semantic evidence — provideraccountprofile.repository.ts

**Archive member:** `src/modules/pharmacy/services/repositories/provideraccountprofile.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderProfile from `../../../provider/schemas`. Lines 8–13 define an injectable `ProviderAccountProfileRepository` extending `MongoRepository<ProviderProfile>`, but inject the model using the literal token `'ProviderAccountProfile'` rather than `ProviderProfile.name`.

**Critical wiring finding:** The repository type is ProviderProfile while the injected token is ProviderAccountProfile. This may be intentional aliasing, but the member itself does not define/register the alias or prove that it resolves to the expected collection/model. A token/schema mismatch could silently target the wrong model or fail at bootstrap; it must be traced against PharmacyModule registrations and all consumers.

**Behavioral scope:** No pharmacy/provider/tenant ownership predicate, active/approved filtering, public projection/redaction, location/delivery eligibility, status transition, transaction or audit behavior is implemented here. All semantics are inherited or delegated to callers.

**Security/integrity implications:** Generic provider profile CRUD in Pharmacy does not itself prevent cross-pharmacy/provider reads or exposure of legal/contact/location/commission fields. The alias token additionally creates a model identity ambiguity in a high-impact pharmacy dispatch/catalog surface.

**Test implications:** verify literal token registration and exact model/collection mapping, provider/pharmacy tenant scope, active/approved/public projection, dispatch identity mapping, location/delivery eligibility, and safe redaction. No tests executed during this semantic read.
