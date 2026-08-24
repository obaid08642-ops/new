# Phase 0B semantic evidence — providers.controller.ts

**Archive member:** `src/modules/providers/providers.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–100; full 100-line member covered.

Lines 2–9 import ProvidersService, auth decorators/enums, apply a class `JwtAuthGuard`, and construct the controller. `@Public()` is used to override the guard for selected endpoints.

Lines 11–16 expose public provider self-registration at `POST /providers/apply` with an untyped `any` body. Lines 18–29 expose public provider listing with type/city/insurance filters. Lines 31–36 expose public map data and parse coordinates/radius with `parseFloat`; no controller-level bounds or finite checks are visible. Lines 38–42 expose public provider detail by ID through `getPublicById`.

Lines 44–49 expose authenticated `GET /providers/me/profile` and restrict roles to doctor, pharmacy, hospital, lab, radiology and home-care. The service performs actor-identifier matching; controller does not add tenant or approval checks.

Lines 52–55 document that legacy provider delta endpoints were removed because their approve path marked deltas approved without applying changes. The canonical delta path is stated as `/provider/settings/delta` to admin provider-delta routes, but this controller does not implement that path.

Lines 58–62 expose admin provider creation with `@Roles(UserRole.ADMIN)` and dynamic body. Lines 64–74 expose admin all/pending lists. Lines 76–92 expose admin approve/reject/suspend actions with dynamic ID and minimally typed reason body. Lines 94–100 expose admin demo seed at `POST /providers/admin/seed-demo`, role-protected only by ADMIN at controller level.

**Authorization:** class JWT guard plus `@Public` creates a public surface for registration/list/map/detail. Admin endpoints use `@Roles(UserRole.ADMIN)`, but tenant scope, separation of duties, license verification, approval prerequisites and idempotency are delegated to service/base guards. `me/profile` role allowlist does not prove account/profile ownership by itself.

**Contract/integrity:** bodies and most query values are dynamic; no visible DTO validation, length limits, regex escaping, coordinate bounds, pagination cursor or Idempotency-Key contract. Route ordering places `@Get(':id')` before `@Get('me/profile')` in source; framework route resolution must be verified to ensure literal `me/profile` is not captured by a parameter route.

**Truthfulness:** admin demo seed is a real DB-writing endpoint. It is labeled idempotent and sample-oriented but no environment/sandbox gate is visible in this controller. Public discovery relies on service filtering; the controller itself does not guarantee that synthetic/demo records cannot appear.

**Test implications:** require live method/path checks, public/unauth/admin/stranger/tenant matrix, route-order regression, DTO and query-bound tests, coordinate validation, pagination/rate limiting, admin approval and seed production gating, replay/idempotency and audit tests. No tests executed during this semantic read.
