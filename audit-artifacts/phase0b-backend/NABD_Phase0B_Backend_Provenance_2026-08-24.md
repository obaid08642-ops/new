# Phase 0B Backend provenance

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`

Source: `nabdah-backend.zip` materialized from the committed Phase 0A baseline archive bytes. Extraction path: `/tmp/nabd-main-audit/phase0b-backend-source` (local verification workspace).

| Metric | Result |
|---|---:|
| Archive members | 1188 |
| Owned source/config members | 1149 |
| Excluded members | 39 |
| SHA-256 mismatches | 0 |
| Semantic `fully_read=YES` | 1 |
| Semantic `fully_read=NO` | 1187 |

Every member is represented in `NABD_Phase0B_Backend_Semantic_Read_Manifest_2026-08-24.tsv`. SHA-256 is checked against the Phase 0A member inventory. One source member (`src/modules/auth/auth.controller.ts`) now has a source-specific semantic evidence file; all other members remain explicitly un-read. This artifact does not claim semantic reading for them.
