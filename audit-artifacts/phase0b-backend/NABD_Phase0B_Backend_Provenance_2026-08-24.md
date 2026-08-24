# Phase 0B Backend provenance

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`

Source: `nabdah-backend.zip` materialized from the committed Phase 0A baseline archive bytes. Extraction path: `/tmp/nabd-main-audit/phase0b-backend-source` (local verification workspace).

| Metric | Result |
|---|---:|
| Archive members | 1188 |
| Owned source/config members | 1149 |
| Excluded members | 39 |
| SHA-256 mismatches | 0 |
| Semantic `fully_read=YES` | 6 |
| Semantic `fully_read=NO` | 1182 |

Every member is represented in `NABD_Phase0B_Backend_Semantic_Read_Manifest_2026-08-24.tsv`. SHA-256 is checked against the Phase 0A member inventory. Six source members (`src/modules/auth/auth.controller.ts`, `src/modules/pharmacy/patient-pharmacy.controller.ts`, `src/modules/wallet/wallet.controller.ts`, `src/modules/orders/orders.controller.ts`, `src/modules/unified-bookings/unified-bookings.module.ts`, and `src/modules/health/health.controller.ts`) now have source-specific semantic evidence files; all other members remain explicitly un-read. This artifact does not claim semantic reading for them.
