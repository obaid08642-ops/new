# Phase 0B semantic evidence — Articles and SEO

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/articles/seo.controller.ts:2–44`
- `src/modules/articles/articles.module.ts:2–196`

The articles module embeds `ArticlesService`, public article routes, admin CMS routes, bookmark contract routes, patient bookmark routes and module wiring (`articles.module.ts:19–196`). Public listing exposes only published/non-deleted articles and omits bodies, but search builds `RegExp(q, 'i')` directly without escaping or a visible search-length bound (`23–32`). Detail increments views asynchronously after returning the article (`39–43`). CMS create/update/publish/unpublish/remove is admin-guarded but accepts raw bodies, including HTML/body, SEO fields, author fields, cover image and tags; update allows arbitrary `$set` fields after removing only id/slug (`52–88,105–117`).

Bookmark contract add/remove uses `@RequireIdempotency` and upsert/delete scoped to authenticated user and published article ID (`120–146`). The legacy bookmark surface exposes full saved article cards, has a non-idempotent toggle, and uses direct model access through an `any` cast (`148–187`). Bookmark results are bounded at 100, but no visible unique index/error contract is shown in this module.

`SeoController` publicly resolves share-link type/slug against medicine, doctor, facility, lab-service and home-care collections, allowing slug/id/name matching and returning a target ID (`seo.controller.ts:14–43`). Unknown types and missing targets return 404. The home-care-service resolver falls back to `labservices`, which can map a home-care URL type to an unrelated lab record when no home-care match exists (`34–36`). No canonical URL, redirect safety, locale, collision handling or rate-limit semantics are visible.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: search regex/DoS and injection-like query risks, raw CMS content/field mutation, missing article moderation/schema validation, legacy bookmark race/replay, PII/content overexposure, SEO type collision and false target resolution, and absent canonical/indexing governance at this backend surface.
