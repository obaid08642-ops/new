# Phase 0B semantic evidence — PharmacyModule

**Archive member:** `src/modules/pharmacy/pharmacy.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 1–137 from the baseline archive extraction.

Lines 1–59 import Pharmacy schemas, provider/system schemas, procurement schemas, all pharmacy services/controllers, dependent modules, GeoEngine, WorkflowEngine, and repository implementations. Lines 60–88 register NotificationsModule, ProviderModule, WorkflowEngineModule, AiModule, and a broad Mongoose schema set including orders, allocations, broadcast/chat, shortages, medicines, inventory, provider profiles/availability, procurement requests, and quotations.

Lines 89–119 register services and repository provider tokens. Core order/allocation/split/inventory/seed/notification/broadcast/chat/shortage/provider-order/procurement services are provided, alongside GeoEngine and repositories for all referenced stores.

Lines 120–134 register patient/provider/admin pharmacy controllers, inventory, broadcast, chat, shortage, and procurement controllers. Lines 135–136 export only PharmacyOrderService, PharmacyAllocationService, and PharmacyOrdersProviderService.

**Wiring semantics:** PharmacyModule exposes a large commerce/workflow surface through multiple controllers and service dependencies. Procurement is wired alongside order allocation and provider flows; AiModule is imported but no direct AI service usage is visible in this member.

**Auth/ownership:** controller-level guards and service-level checks are delegated to the registered controllers/services; module itself has no guard.

**State transitions:** module wiring enables order, allocation, broadcast, shortage, chat, inventory, procurement, and provider lifecycle state machines.

**Price/payment/insurance source:** module registers repositories/schemas but contains no business pricing/payment logic.

**Security/truthfulness observations:** many schemas are re-registered in one module, requiring model-name compatibility; repository token names are string-based and wiring errors would be runtime failures; export list is narrower than internal service usage; procurement/admin/test routes are exposed only through controller guards, not module boundary. No remediation performed.

**Test implications:** Nest module compilation, provider token resolution, duplicate model registration, controller guard metadata, repository implementation binding, exported service consumers, and production startup. No tests executed during this semantic read.

**Consumer traceability:** module-to-controller/service map will feed the dedicated route-to-consumer phase.
