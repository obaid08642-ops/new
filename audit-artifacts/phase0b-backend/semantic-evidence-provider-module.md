# Phase 0B semantic evidence — provider.module.ts

**Archive member:** `src/modules/provider/provider.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–192; full 192-line member covered.

Lines 2–76 import Mongoose/JWT, Provider schemas, request/capability schemas, StorageModule, all Provider services, controllers, repositories and additional image/home-care/radiology/leave schemas. Lines 78–113 register Mongoose models. The module uses a mix of literal model names (`ProviderAccount`, `ProviderAccountProfile`, `ProviderDocument`, etc.) and schema `.name` values, while registering both `HomeCareBooking`/`NursingVisitReport` and `RadiologyBooking` alongside the Provider models.

Lines 114–121 register JWT asynchronously from `process.env.JWT_SECRET`; startup fails without a secret and production requires length >=32. Tokens are configured with `expiresIn: '14d'`. Lines 122–123 import StorageModule.

Lines 124–142 register SimulatedFeaturesController, LeaveRequestsController, all Provider controllers including ProviderWalletController, and Phase 1C capabilities/zones/slots/score/admin-matching controllers. Lines 143–186 register Provider services plus repository provider tokens, including all catalog, identity, audit, session, request, availability, assignment and score repositories. Lines 187–190 export selected services for other modules.

**Wiring correctness:** the module provides the injected string tokens used by services/controllers and registers the matching model names. However, literal model-name dependencies and duplicate/legacy domain models create mapping risk; correct registration does not prove schema-level security or consumer ownership. The module includes simulated features and seed-capable controllers in the same production module.

**Security:** JWT fail-closed startup is positive, but 14-day token lifetime is a module-level policy and no refresh/revocation/device binding appears here. Storage is imported but private/signed access is not established by module wiring. Controller role/permission guards remain per-controller/service concerns.

**Truthfulness/production:** `SimulatedFeaturesController`, ProviderSeedService and admin seed/matching endpoints are wired into the same module as production flows. No environment/feature gate is visible in this module. Registration of a seed/test surface is not itself proof that it is unreachable in production.

**Operational:** Mongoose models and repositories are registered without visible indexes, transactions, migrations, outbox, retry or observability configuration. Exported services widen the surface available to consuming modules.

**Test implications:** verify all injection tokens resolve to intended models, detect duplicate/legacy model mappings, enforce production route gating for simulated/seed flows, test JWT expiry/revocation policy, storage private access, controller authorization, indexes/unique constraints and module startup with required dependencies. No tests executed during this semantic read.
