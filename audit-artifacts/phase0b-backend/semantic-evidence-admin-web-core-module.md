# Phase 0B semantic evidence — Admin web core module boundary

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin-web-core/admin-web-core.module.ts:2–51`

`AdminWebCoreModule` imports `FinanceEngineModule`, registers eleven Mongoose models/schemas and wires seven administrative controllers: analytics, finance, provider moderation, system health, admin config, admin governance and extended operations (`admin-web-core.module.ts:2–49`). It provides no module-local providers/exports and relies on imported module/provider/controller wiring. The boundary contains schemas for heatmaps, commission ledger, fraud alerts, audit logs, procurement, providers, extended system config, withdrawals, emergency requests and appointments (`11–39`).

Because multiple high-impact controllers and financial/operational schemas share one module boundary, authorization and data projection policy are not enforced by the module itself; correctness depends on each controller and imported module. The module also wires both provider-ops withdrawal schema and finance engine, creating potential duplicate financial/control-plane ownership that requires route/model inventory. No explicit global `RolesGuard`, audit interceptor, transaction policy, or provider exports are visible in this member.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: privilege coupling, duplicated financial/control-plane boundaries, module-level policy absence, broad schema exposure and route-policy drift risk.
