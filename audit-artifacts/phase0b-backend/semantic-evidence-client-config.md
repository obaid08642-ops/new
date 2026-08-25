# Phase 0B semantic evidence — Client Config

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/config/config.service.ts:2–39`
- `src/modules/config/config.controller.ts:2–17`
- `src/modules/config/config.module.ts:2–10`

`ConfigService:5–37` builds a client response directly from environment variables: feature flags, VAT percentage, delivery base fee, support phone/email, and app version. Feature values are interpreted only by exact string `true`; numeric pricing accepts any finite number, including negative, NaN-filtered but otherwise unbounded values. There is no visible schema/version metadata beyond nullable `APP_VERSION`, provenance, effective time, tenant/locale targeting, or audit.

`ConfigController:7–16` has a JWT guard but is explicitly marked `@Public()`, so startup clients can fetch all exposed config without authorization. The response includes pricing and contact settings and any configured feature flags. `ClientConfigModule:5–10` only wires this controller/service.

## Findings candidates

The read supports: public operational/pricing flag disclosure, unsafe/unbounded environment coercion, no effective/versioned configuration contract, and ambiguity between public client configuration and sensitive/internal rollout controls.

No product code was changed and no tests/builds were executed during this semantic read.
