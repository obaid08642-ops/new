# Phase 0B semantic evidence — medicines.module.ts

**Archive member:** `src/modules/medicines/medicines.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–14; full 14-line member covered.

Lines 2–6 import MongooseModule, MedicinesController/PublicCatalogController, MedicinesService, Medicine schema and MedicineRepository. Lines 8–13 define MedicinesModule.

Line 9 registers the Medicine model. Line 10 mounts both the authenticated-class/public-exception MedicinesController and the public static-fragment PublicCatalogController. Line 11 provides MedicinesService and the string-token MedicineRepository; line 12 exports the service. No module-level guard, role policy, idempotency interceptor, transaction/session provider, outbox or audit provider is registered here.

**Audit judgment:** Security and route semantics are therefore distributed between controller decorators/global configuration and service logic; module wiring does not close the duplicate route, raw DTO, replay or public-governance risks found in the controller/service.

No product code was changed and no tests were executed during this semantic read.
