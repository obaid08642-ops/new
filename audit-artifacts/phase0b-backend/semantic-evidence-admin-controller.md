# Phase 0B semantic evidence — AdminController

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/admin/admin.controller.ts:2–587`

`admin.controller.ts:19–30` applies JWT and a controller-wide `@Roles(UserRole.ADMIN)` restriction, while several operations have sensitive owner/provider effects. Referral and loyalty reports (`:39–131`) aggregate platform-wide invites, points, balances and transactions and resolve names/phone identifiers. `:139–235` returns a broad user 360 profile with email/phone, provider/license fields, activity, SOS location and raw provider deltas. Disputes `:242–245` intentionally returns ServiceUnavailable rather than a queue.

User directory/stats (`:251–317`) expose searchable identity data and role counts. Owner-only sub-admin management (`:319–413`) depends on a designated email fallback, accepts raw bodies, can generate and return an initial password, and deletes sub-admin documents. Provider creation (`:423–455`) accepts raw body fields and returns generated initial credentials. Account ban/unban (`:457–484`) toggles active/suspended with separate save and emits best-effort events. Permanent deletion (`:490–523`) iterates a hard-coded list of collections and deletes directly-owned records non-transactionally, while preserving shared records by comment.

Provider approval/suspension (`:529–552`) changes `verified/suspended` with no visible transition/role/provider-account synchronization. Provider delta endpoints (`:555–585`) use POST for retrieval, return raw pending deltas, and approve/reject status without applying requested changes; comments explicitly state application is not implemented. Many routes use raw `any` bodies, no visible idempotency/step-up/maker-checker/audit enforcement and best-effort event emission.

## Findings candidates

The read supports: excessive admin PII/PHI exposure, owner identity fallback, credential return, non-atomic deletion and account transitions, provider approval state drift, raw delta disclosure and false-success approval, missing scoped audit/step-up/idempotency and unbounded operational reports.

No product code was changed and no tests/builds were executed during this semantic read.
