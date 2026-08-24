# Nabd Main Archive Provenance — Phase 0A

**Baseline commit:** `22526bedb77a3d8148219036367e4714f401aecc`
**Source rule:** Every archive byte below was materialized by `git show <baseline>:<archive>` from the baseline commit. No working-tree copy, later branch, or deployed artifact was used.

## Archive-level provenance

| Archive | SHA-256 | Total members | Owned source/config candidates | Excluded members | Baseline member bytes | Extraction path |
|---|---|---:|---:|---:|---|---|
| `NabdProvider-provider.zip` | `4655c5c018e403c3ab3eb8c13645d876cc7f69b73f5ba6dd9050186917c92d4c` | 83 | 78 | 5 | verified with `unzip -tq` | `audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/NabdProvider-provider.zip` |
| `nabd-patient-web.zip` | `807237bb57c09964e13698c650b4258547ab280df48f2913d0179a16e6977ad5` | 1126 | 1071 | 55 | verified with `unzip -tq` | `audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd-patient-web.zip` |
| `nabd_plus_patient_app.zip` | `70d01d4857e5326e17f3f3c14f35b20b4bbdbf775919d12bc7e280c24a84964b` | 665 | 605 | 60 | verified with `unzip -tq` | `audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabd_plus_patient_app.zip` |
| `nabdah-backend.zip` | `3ca5113e2f1b96ad1f9fd647e7a2e0a0727a6cff4850cf2a177d3c647bc5d36d` | 1188 | 1149 | 39 | verified with `unzip -tq` | `audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/nabdah-backend.zip` |
| `web_admin_dashboard.zip` | `b32648f90eadcf7520644f77398bd99e9c2660ddde2e27bab160b5faaac65b82` | 66 | 59 | 7 | verified with `unzip -tq` | `audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/web_admin_dashboard.zip` |
| **TOTAL** | — | **3128** | **2962** | **166** | — | — |

## Member-level mapping

The complete member-level map is `NABD_Main_Archive_Member_Inventory_2026-08-24.tsv`. Each row maps one archive member to its archive, real member path, SHA-256, line count where text-readable, kind, inferred role/domain, status and `Fully read` state. `NABD_Main_Archive_Exclusions_2026-08-24.tsv` separately records every binary/generated/dependency/non-source exclusion with its archive, member path, SHA-256 and reason.

## Exclusion rules

Binary assets and binary packages are provenance-tracked but excluded from semantic source reading. Dependency trees, generated/build/coverage output, vendor copies, and generated clients are excluded from the owned first-party semantic set because they are not first-party source members. Lockfiles and non-source archive members are recorded as exclusions where classified. A first-party source/config/schema/route/test/controller/service/DTO/guard/repository/job/gateway/CI/deployment-template member is **not** excluded merely because it is difficult to read.

## Read-status truth

The generated manifest currently records `Fully read=YES: 0` and `Fully read=NO: 3128`; this is intentional and truthful at this checkpoint. Inventory completeness is not semantic-read completeness. No Root Audit Final Closure claim is valid until each owned member has a defensible full semantic read plus evidence/linkage, or a reviewer-approved legitimate exclusion. The present Phase 0A state is therefore a correction-in-progress, not an accepted closure.
