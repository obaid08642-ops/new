# Phase 0B semantic evidence — providers.module.ts

**Archive member:** `src/modules/providers/providers.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–29; full 29-line member covered.

Lines 2–14 import `MongooseModule`, `ProvidersController`, `ProvidersService`, User/ProviderProfile/HospitalSubEntity/ProviderBranch/Appointment schemas, two repository implementations, and HospitalEnterpriseController.

Lines 15–24 register five Mongoose models: User, ProviderProfile, HospitalSubEntity, ProviderBranch and Appointment. Lines 25–27 register ProvidersController and HospitalEnterpriseController; provide ProvidersService plus string tokens `ProviderProfileRepository` and `UserRepository`; export only ProvidersService. Line 29 closes the module.

**Domain boundary:** This is a separate, narrower ProvidersModule from the broader ProviderModule. It owns public/provider discovery and hospital-enterprise surfaces plus user/profile/branch/appointment persistence. Only ProvidersService is exported; repositories and models remain module-local.

**Security/ownership:** No guards or validation are established at module level. The controllers/services must enforce public-vs-authenticated access, provider ownership, hospital sub-entity ownership, and appointment tenancy. Registration of Appointment and ProviderBranch here creates a cross-domain consistency risk if other modules register/use the same collections with different policies.

**Operational/integrity:** No transaction/session provider, cache, idempotency, event/outbox, index or observability wiring is visible. Repository tokens are local strings and must be checked against exact injection sites. No environment gate is visible for hospital-enterprise or provider mutation surfaces.

**Test implications:** verify duplicate model registration behavior across modules, repository token resolution, owner/stranger/unauth tests for profile/branch/appointment/hospital operations, route/controller authorization, unique/index constraints, transaction behavior and module startup. No tests executed during this semantic read.
