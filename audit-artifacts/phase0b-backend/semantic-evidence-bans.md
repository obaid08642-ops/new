# Phase 0B semantic evidence — Bans

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/bans/bans.service.ts:2–53`
- `src/modules/bans/bans.controller.ts:2–34`
- `src/modules/bans/bans.module.ts:2–15`
- `src/modules/bans/bans.schema.ts:2–32`
- `src/modules/bans/bans.middleware.ts:2–25`
- `src/modules/bans/repositories/ban.repository.ts:2–13`

`bans.service.ts:12–25` loads active nonexpired bans into an in-memory set at module init/refresh. `:27–44` creates bans from admin input, refreshes the entire cache, and unbans all records matching only `value` regardless of type; no duplicate guard, normalization or audit event is visible. `:46–52` checks exact type/value and returns all bans. `bans.controller.ts:14–34` protects routes with JWT and admin/super-admin role, validates create type/value/reason/expiry with a DTO, but delete `:value` has no type parameter and list returns all records to admins without pagination/field minimization.

`bans.middleware.ts:9–25` trusts the first `x-forwarded-for` header or socket address for IP identity and accepts any client-provided `x-device-id`; it blocks using the in-memory cache and throws a generic forbidden response. No trusted-proxy normalization, device attestation, rate/abuse handling, stale-cache fallback contract, audit or fail-safe behavior is visible. `bans.schema.ts:7–32` has enum type, raw value, reason, admin ID, expiry and active flag but no compound uniqueness, normalized hash, effective/revoked audit timestamps or reason bounds. Module is global and registers the model/repository; repository is a thin wrapper.

## Findings candidates

The read supports: spoofable forwarded IP/device identity, stale or incomplete cache enforcement, type-blind unban, duplicate active bans, raw value/admin list exposure, missing revocation/audit/retention and global middleware failure semantics.

No product code was changed and no tests/builds were executed during this semantic read.
