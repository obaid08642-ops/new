# Nabd Main Source Manifest — Phase 0A inventory

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`

This manifest is generated from archive bytes materialized with `git show <baseline>:<archive>` only. It is not a semantic-read closure: `Fully read=YES` is intentionally not asserted for any member by this generator.

| Archive | Total members | Owned source/config members | Exclusions | Fully read YES | Fully read NO |
|---|---:|---:|---:|---:|---:|
| `NabdProvider-provider.zip` | 83 | 78 | 5 | 0 | 83 |
| `nabd-patient-web.zip` | 1126 | 1071 | 55 | 0 | 1126 |
| `nabd_plus_patient_app.zip` | 665 | 605 | 60 | 0 | 665 |
| `nabdah-backend.zip` | 1188 | 1149 | 39 | 0 | 1188 |
| `web_admin_dashboard.zip` | 66 | 59 | 7 | 0 | 66 |
| **TOTAL** | **3128** | **2962** | **166** | **0** | **3128** |

## Member-level fields

Every archive member is represented in `NABD_Main_Archive_Member_Inventory_2026-08-24.tsv` with archive/member path, SHA-256, line count, kind, role, domain, status, and read state. Excluded binary/generated/dependency members are listed separately in `NABD_Main_Archive_Exclusions_2026-08-24.tsv`.

## Closure gate

This is an inventory-complete but semantic-read-incomplete state. The audit must not claim Root Audit Final Closure until every owned member has either a defensible full semantic read with evidence and route/screen/schema/test linkage, or a documented first-party exclusion approved by the reviewer.
