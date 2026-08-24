# Phase 0B semantic evidence — pharmacy_ops.module.ts

**Archive member:** `src/modules/pharmacy_ops/pharmacy_ops.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–25; full 25-line member covered.

Lines 2–11 import MongooseModule, canonical and alias controllers, PharmacyOpsService, Order/Medicine/PharmacyInventory schemas, OrdersModule and the three repository wrappers. Lines 13–24 define PharmacyOpsModule.

Lines 14–21 register Order, Medicine and PharmacyInventory models and import OrdersModule. Lines 22–23 register both PharmacyOpsController and ProviderPharmacyAliasController, plus PharmacyOpsService and repository providers under string tokens. No IdempotencyInterceptor, transaction/session provider, event outbox, module-level JwtAuthGuard or role guard is registered here.

**Audit judgment:** Module wiring confirms that canonical and alias surfaces share the same service/repository layer, but it adds no authorization parity, atomicity, idempotency, schema-level uniqueness or audit infrastructure. The alias controller’s weaker explicit role decoration therefore remains a controller/global-guard verification requirement rather than being closed by module wiring.

No product code was changed and no tests were executed during this semantic read.
