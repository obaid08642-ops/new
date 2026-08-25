# Phase 0B semantic evidence — i18n

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/i18n/i18n.service.ts:2–743`
- `src/modules/i18n/i18n.controller.ts:2–23`
- `src/modules/i18n/i18n.module.ts:2–11`

`DICTIONARY` supports only `ar|en|ur` (`i18n.service.ts:3–4`) despite broader product language expectations. The dictionary includes user-facing labels for patient, driver, pharmacy, provider, admin, booking, notification, health and error surfaces, plus several duplicated/named namespaces and strings that can become stale (`10–724`). `I18nService.t` returns the key unchanged for missing keys, falls back silently to Arabic/default, and performs a single non-global `{param}` replacement using `String(val)` (`726–733`). `all` returns a full language bundle and `raw` returns the entire dictionary (`735–742`).

`I18nController` is declared with `@UseGuards(JwtAuthGuard)` but the file does not import `JwtAuthGuard` (`i18n.controller.ts:2–8`), making compilation/runtime wiring a material defect to verify. Both bundle endpoints are marked `@Public`: `GET /i18n?lang=...` returns all translations for a selected language (`12–16`), while `GET /i18n/all` returns raw nested dictionaries for all supported languages (`18–21`). No visible language allowlist normalization, cache headers, versioning, tenant/brand scope, key filtering or rate policy exists. `I18nCoreModule` is global and exports the service (`i18n.module.ts:5–10`).

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: public full dictionary disclosure, undefined language acceptance with silent fallback, unsupported language coverage, missing guard import/compile risk, silent missing-key fallback, incomplete interpolation, duplicate/stale keys/messages, and absence of schema/version/cache governance.
