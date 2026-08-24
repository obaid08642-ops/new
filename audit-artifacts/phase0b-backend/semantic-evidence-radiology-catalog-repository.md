# Phase 0B semantic evidence — radiologyservicecatalogitem.repository.ts

**Archive member:** `src/modules/provider/services/repositories/radiologyservicecatalogitem.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and RadiologyServiceCatalogItem. Lines 8–13 define an injectable repository extending `MongoRepository<RadiologyServiceCatalogItem>` and pass the named model to the superclass.

**Behavioral scope:** No custom catalog lookup, provider ownership, active/published filtering, modality/body-part validation, price/currency, home-visit capability, insurance eligibility, effective-date/versioning, projection, transaction or audit behavior is implemented here. All semantics are delegated to callers/schema/database.

**Truthfulness/integrity:** Generic CRUD does not guarantee that public radiology services are approved and active, that modality/body-part data is valid, that home-visit flags are truthful, or that listed prices remain server-authoritative and consistent with booking snapshots.

**Test implications:** verify model token resolution, provider/tenant ownership, active/published/public filtering, modality and capability validation, price/currency/insurance invariants, effective-date/version behavior, duplicate prevention and least-privilege projections. No tests executed during this semantic read.
