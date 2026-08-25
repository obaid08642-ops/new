# Phase 0B semantic evidence — Community

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/community/community.service.ts:2–198`
- `src/modules/community/community.controller.ts:2–87`
- `src/modules/community/community.module.ts:2–22`
- `src/modules/community/repositories/post.repository.ts:2–13`
- `src/modules/community/repositories/postcomment.repository.ts:2–13`
- `src/modules/community/repositories/livesession.repository.ts:2–13`
- `src/schemas/community.schemas.ts:2–65`

`community.service.ts:36–69` lists published posts and returns detail with published comments, while `:48–60` creates posts from a partially typed body and uses a small keyword heuristic to select pending review. `:72–101` creates comments and increments `comment_count` separately; moderated comments are stored as removed, and notification emit failures are swallowed. `:104–130` toggles votes by reading arrays then issuing updates; concurrent requests can produce counter/array drift. `:132–156` allows author delete and admin moderation without visible idempotency, audit actor/reason or transition policy. `:160–197` lists/creates/joins/updates live sessions; create and status update accept host/body data, status update has no host/admin authorization in service, and join uses `$addToSet` plus unconditional `$inc`, so retries can inflate attendee_count.

`community.controller.ts:9–87` globally applies JwtAuthGuard but falls back to literal `'guest'` when `req.user?.id` is absent for create/comment/vote/delete/session create/join, creating a shared pseudo-identity. Bodies are raw `any` or lightly inline typed; admin pending/moderate endpoints have no visible `@Roles` decorator in this controller. `community.schemas.ts:5–65` stores unbounded title/body/comment/description strings, arbitrary categories/status strings, voter and attendee ID arrays, stream URL and anonymous flags; no content bounds, enum validators, moderation audit, retention or index for primary list queries is visible.

The three repositories are constructor-only MongoRepository wrappers over Post, PostComment and LiveSession and add no ownership, validation, atomicity or moderation behavior. `community.module.ts:10–22` registers the three schemas/controllers/repositories and exports CommunityService.

## Findings candidates

The read supports: shared `guest` pseudo-identity fallback under guarded routes, missing role enforcement on admin moderation routes, raw/unbounded content and URL fields, keyword-only moderation, vote/counter races, non-idempotent comment/session mutations, host authorization gaps, and missing moderation/audit/retention contracts.

No product code was changed and no tests/builds were executed during this semantic read.
