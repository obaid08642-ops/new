# Phase 0B semantic evidence — orders.module.ts

**Archive member:** `src/modules/orders/orders.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–37; full 37-line member covered.

Lines 2–10 import MongooseModule, OrdersController/OrdersService/DispatchService, and six schemas: Order, PharmacyBid, Medicine, Delivery, ProviderProfile and PharmacyInventory. Lines 11–12 import WorkflowEngineModule and FinanceEngineModule. Lines 13–18 import six repository classes.

Lines 20–31 define OrdersModule imports: WorkflowEngineModule, FinanceEngineModule, and MongooseModule.forFeature registrations for the six order-related models. Lines 33–35 register OrdersController, OrdersService, DispatchService, six repository providers under string tokens, and export OrdersService/DispatchService. Line 37 closes the module.

**Wiring scope:** The module exposes order service and dispatch service to other modules. FinanceEngineModule and WorkflowEngineModule are dependencies, but this member does not prove transaction boundaries, payment authorization, workflow state enforcement or event/outbox behavior. Repository token providers are thin wrappers and must be traced at consumers for ownership and atomicity.

**Model duplication risk:** OrdersModule registers ProviderProfile, Medicine and PharmacyInventory schemas from `../../schemas`, while ProviderModule/ProvidersModule also register similarly named domain models and capability variants. The baseline therefore requires token/collection/model mapping verification to avoid reading or writing a different model shape than the intended provider/pharmacy surface.

**Security/integrity:** No guards, interceptors, idempotency provider, transaction/session provider, validation pipe, public projection policy or authorization module is configured here. This does not establish that controllers/services are unsafe by itself, but it means these controls are not module-level defaults.

**Test implications:** verify module bootstrap and token resolution; exact model/collection mappings; Workflow/Finance integration; exported service exposure; ownership/role guards at controller/service; idempotency and transaction behavior; and duplicate model/collection compatibility. No tests executed during this semantic read.
