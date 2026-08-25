# Phase 0B semantic evidence — Seed module wiring

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/seed.module.ts:1–37`

`SeedModule` registers User, PatientProfile, ProviderProfile, Medicine, PharmacyInventory, Facility, LabService and SystemConfig schemas and provides `SeedService` plus eight repository providers through string tokens (`seed.module.ts:21–35`). This aggregates identity, health/PII, catalog, inventory, facility, lab and system-configuration persistence in one module, but the module contains no environment guard, production hard stop, seed capability token, authorization/role gate, transaction/session policy, source snapshot/version, or audit/provenance wiring (`21–35`). It exports only `SeedService`, while repositories are provider-local, so safety depends on SeedService and module composition not shown here.

The LabService model is registered with literal `'LabService'` while other schemas use `.name`; repository wiring uses the same literal but no central token registry/startup assertion exists (`10,30`). Repository providers are declared with string tokens that can be accidentally duplicated or injected into unrelated runtime contexts; no explicit `useFactory` policy attaches environment or seed context (`12–19,34`). The module imports full operational schemas for User/PatientProfile/SystemConfig and inventory, increasing blast radius if seed activation is misconfigured. No product code was changed and no tests/builds were executed during this semantic read.
