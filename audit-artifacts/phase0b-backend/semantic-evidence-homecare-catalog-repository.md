# Phase 0B semantic evidence — homecareservicecatalogitem.repository.ts

**Archive member:** `src/modules/provider/services/repositories/homecareservicecatalogitem.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and HomeCareServiceCatalogItem. Lines 8–13 define an injectable repository extending `MongoRepository<HomeCareServiceCatalogItem>` and pass the injected model named from `HomeCareServiceCatalogItem.name` to the superclass.

**Behavioral scope:** No custom catalog query, active/approved filter, provider ownership, price/currency validation, versioning, audit, transaction, projection or tenant policy is implemented here. All semantics are inherited or delegated to service callers.

**Truthfulness/integrity:** Since the entity is a home-care catalog item, generic CRUD does not itself guarantee server-authoritative prices, published/active status, provider eligibility, effective dates or prevention of duplicate catalog entries. Consumer services must enforce these invariants.

**Test implications:** verify model token resolution, inherited CRUD behavior, public active/published filtering, provider ownership, price/currency invariants, effective-date handling, duplicate prevention, and least-privilege projections. No tests executed during this semantic read.
