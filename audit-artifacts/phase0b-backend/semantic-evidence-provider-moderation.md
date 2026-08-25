# Phase 0B semantic evidence — Provider Moderation

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:**
- `src/modules/admin-web-core/controllers/provider-moderation.controller.ts:2–118`

`ProviderModerationController:8–14` defines a `/providers` controller with no visible JWT, role or permission guard. `:16–35` resolves replacement image values and emits storage deletion events best-effort. `:44–49` exposes pending `provider_deltas` via POST and returns raw documents. `:51–80` approves a delta after reading it, unwraps legacy structures, resolves the target profile through multiple aliases (`account_id`, `user_id`, `id`), purges replaced images best-effort, updates profile fields by spreading raw changes, then separately updates the delta status and returns success/applied count. `:82–117` similarly rejects a delta, performs best-effort cleanup, then marks status rejected. No DTO allowlist, field-level protection, maker-checker, idempotency, transaction, optimistic version, or durable audit is visible.

## Findings candidates

The read supports: unguarded admin moderation exposure/mutations, raw requested-change disclosure, ambiguous account/profile targeting, arbitrary field spread, non-atomic profile/delta transitions, best-effort storage cleanup and misleading success semantics.

No product code was changed and no tests/builds were executed during this semantic read.
