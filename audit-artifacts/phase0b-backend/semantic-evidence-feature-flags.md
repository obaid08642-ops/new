# Phase 0B semantic evidence — Feature Flags

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/feature-flags/feature-flags.service.ts:2–22`
- `src/modules/feature-flags/feature-flags.controller.ts:2–36`
- `src/modules/feature-flags/feature-flags.module.ts:2–18`

`feature-flags.service.ts:7–20` provides key lookup, upsert mutation and unbounded all-flags read through a repository. `:15–17` changes any supplied key with `upsert:true` and no visible allowlist, version/compare-and-set, idempotency, audit or rollout guard.

`feature-flags.controller.ts:8–18` exposes all flags publicly via `@Public()` for mobile startup, returning the repository result directly. `:20–35` protects the admin controller only with JWT at class level, while `@Roles(UserRole.ADMIN)` is placed on methods; the mutation accepts a raw route key and body boolean without DTO/schema validation, idempotency or audit. The public response can reveal internal feature names and rollout state, and a client can potentially make decisions based on sensitive operational flags.

`feature-flags.module.ts:8–17` wires the Mongoose schema and repository provider, with both public and admin controllers.

## Findings candidates

The read supports: public disclosure of internal flag inventory/state, arbitrary flag creation/mutation via upsert, weak admin boundary assumptions, raw input and absent audit/idempotency/rollout safety, and unbounded flag response.

No product code was changed and no tests/builds were executed during this semantic read.
