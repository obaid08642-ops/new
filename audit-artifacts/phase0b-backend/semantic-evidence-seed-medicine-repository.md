# Phase 0B semantic evidence — Medicine seed repository

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/seed/repositories/medicine.repository.ts:1–13`

`MedicineRepository` is an injectable typed wrapper around `MongoRepository<MedicineDocument>`, binding `Medicine.name` to `Model<MedicineDocument>` (`seed/repositories/medicine.repository.ts:2–11`). Despite the typed document, the repository defines no seed-only capability, production-environment hard stop, import/source version, reconciliation key, duplicate prevention, publication/readiness gate, tenant scope, inventory/price separation, soft-delete policy, optimistic versioning, audit/provenance marker or rollback boundary. Generic inherited operations therefore remain the only persistence contract. If this repository is reachable from runtime wiring or rerun against production, bootstrap data can overwrite or mix with operational catalog truth; the member itself provides no evidence that this is impossible. No product code was changed and no tests/builds were executed during this semantic read.
