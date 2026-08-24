# Phase 0B semantic evidence — labs.module.ts

**Archive member:** `src/modules/labs/labs.module.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–37; full 37-line member covered.

Lines 2–18 import Mongoose, three controllers (`LabsController`, `LabResultsController`, `LabsEngineController`), three services (`LabsService`, `LabResultsService`, `LabPdfService`), two groups of lab schemas, `WorkflowEngineModule`, four repositories, and `ProviderProfile` schema. Lines 20–32 define the module, import `WorkflowEngineModule`, and register seven Mongoose models: `LabService`, `LabBooking`, `LabCenterBooking`, `LabCatalog`, `LabResult`, `LabSample`, and `ProviderProfile`.

Lines 33–35 register the three controllers, provide the three services and four repository tokens, and export `LabsService`, `LabResultsService`, and `LabPdfService`. The module therefore exposes both the workflow-oriented schemas from `../../schemas/lab.schema` and the separate `LabCenterBooking`/`LabCatalog` schemas from the module-local `schemas` directory.

**Wiring/security observations:** module registration itself does not apply global guards, role guards, interceptors, rate limits, or idempotency. Security must be established on controllers/services/global middleware. The simultaneous `LabBooking` and `LabCenterBooking` model registrations are a potential semantic split requiring route/model mapping verification; the engine controller explicitly injects `LabCenterBooking`, while LabsService tests/repositories use `LabBooking` from the shared schema.

**Truthfulness/data source:** no pricing/payment/insurance computation or external data source visible. The module exports PDF generation service, so downstream consumers may generate reports; its security/data-quality constraints are documented separately.

**Test implications:** verify all three controllers resolve the intended model, no cross-model booking bypass exists, providers/repositories are bound to expected tokens, guards/interceptors apply consistently, and exports do not expose unscoped operations. No tests executed during this semantic read.
