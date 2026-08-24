# Phase 0B semantic evidence — providerdeliveryzone.repository.ts

**Archive member:** `src/modules/provider/services/repositories/providerdeliveryzone.repository.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–13; full 13-line member covered.

Lines 2–6 import Nest model injection, Mongoose Model, the shared MongoRepository and ProviderDeliveryZone. Lines 8–13 define an injectable repository extending `MongoRepository<ProviderDeliveryZone>` and pass the named model to the superclass.

**Behavioral scope:** No custom geospatial query, provider ownership, active/effective-date filter, overlap/uniqueness, coordinate validation, tenant scope, projection, transaction or audit behavior is implemented. These are delegated to callers/schema/database.

**Security/integrity:** Generic CRUD around delivery zones does not guarantee that a provider can only edit its own zones, that polygons/radii are valid and bounded, or that overlapping zones and stale zones are handled deterministically. If used in order/home-care eligibility, missing geofence enforcement could cause service outside licensed coverage.

**Test implications:** verify model token resolution, provider/tenant ownership, valid coordinate/polygon/radius bounds, overlap and effective-date rules, public projection, concurrent updates and eligibility behavior. No tests executed during this semantic read.
