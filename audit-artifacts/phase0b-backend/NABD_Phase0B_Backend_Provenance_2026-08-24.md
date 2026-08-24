# Phase 0B Backend provenance

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`

Source: `nabdah-backend.zip` materialized from the committed Phase 0A baseline archive bytes. Extraction path: `/tmp/nabd-main-audit/phase0b-backend-source` (local verification workspace).

| Metric | Result |
|---|---:|
| Archive members | 1188 |
| Owned source/config members | 1149 |
| Excluded members | 39 |
| SHA-256 mismatches | 0 |
| Semantic `fully_read=YES` | 35 |
| Semantic `fully_read=NO` | 1153 |

Every member is represented in `NABD_Phase0B_Backend_Semantic_Read_Manifest_2026-08-24.tsv`. SHA-256 is checked against the Phase 0A member inventory. Thirty-five source members (`src/modules/auth/auth.controller.ts`, `src/modules/pharmacy/patient-pharmacy.controller.ts`, `src/modules/wallet/wallet.controller.ts`, `src/modules/orders/orders.controller.ts`, `src/modules/unified-bookings/unified-bookings.module.ts`, `src/modules/health/health.controller.ts`, `src/modules/home-care/home-care.controller.ts`, `src/modules/radiology/radiology.controller.ts`, `src/modules/labs/labs.controller.ts`, `src/modules/wallet/wallet.service.ts`, `src/modules/care/appointments.controller.ts`, `src/modules/care/appointments.service.ts`, `src/modules/labs/labs.service.ts`, `src/modules/labs/lab-results.controller.ts`, `src/modules/labs/lab-results.service.ts`, `src/modules/auth/auth.service.ts`, `src/common/auth.guard.ts`, `src/modules/auth/passkey.service.ts`, `src/modules/auth/device-trust.service.ts`, `src/modules/auth/auth.module.ts`, `src/modules/auth/passkey.controller.ts`, `src/modules/orders/orders.service.ts`, `src/modules/pharmacy/pharmacy.controllers.ts`, `src/modules/pharmacy/services/pharmacy-order.service.ts`, `src/modules/pharmacy/services/pharmacy-orders-provider.service.ts`, `src/modules/pharmacy/services/pharmacy-allocation.service.ts`, `src/modules/pharmacy/services/smart-split.service.ts`, and `src/modules/pharmacy/services/pharmacy-broadcast.service.ts`, and `src/modules/pharmacy/services/pharmacy-chat.service.ts`, and `src/modules/pharmacy/services/pharmacy-shortage.service.ts`, and `src/modules/pharmacy/services/procurement.service.ts`, and `src/modules/pharmacy/services/pharmacy-notification.service.ts`, and `src/modules/pharmacy/services/pharmacy-inventory-ext.service.ts`, and `src/modules/pharmacy/services/pharmacy-seed.service.ts`, and `src/modules/pharmacy/pharmacy.module.ts`) now have source-specific semantic evidence files; all other members remain explicitly un-read. This artifact does not claim semantic reading for them.
