# Phase 0B semantic evidence — Core admin module wiring

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/admin/admin.module.ts:2–20`

`AdminModule` registers `User`, `ProviderDelta`, `Appointment` and `EmergencyRequest` Mongoose models and exposes `AdminController` (`admin.module.ts:9–18`). The module does not declare providers, exports, guards, interceptors or explicit policy wiring. The controller is therefore coupled to model registration but the module itself does not establish a visible privilege boundary, audit provider or service abstraction (`2–20`).

This file is wiring-only; the associated `admin.controller.ts` remains a separate manifest member and requires its own semantic read. No product code was changed and no tests/builds were executed during this read.
