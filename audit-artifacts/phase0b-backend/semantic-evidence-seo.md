# Phase 0B semantic evidence — SEO

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Members read in full:**
- `src/modules/seo/seo.service.ts:2–434`
- `src/modules/seo/seo.controller.ts:2–77`
- `src/modules/seo/seo.module.ts:2–32`

`seo.service.ts:25–81` maps six entity types to repositories, applies public eligibility/review/indexing queries and resolves exact slug, fuzzy name or ID-prefix. Fuzzy matching uses a regex built from the slug without visible escaping/bounds, and type is accepted as a free string before model lookup. `:83–215` generates meta/OG/Twitter/JSON-LD from entity fields; public entity data is returned as `entity` and structured types are basic, with no visible field allowlist/escaping/price-offer consistency beyond selected values. `:221–258` builds XML sitemap from live models with a 5,000-row cap per entity and directly interpolates location/slug/lastmod values without XML escaping.

`:264–281` emits robots rules that allow `/` broadly while disallowing selected paths and points to `/api/v1/seo/sitemap.xml`. `:289–397` generates llms.txt using hard-coded platform claims, coverage/payment text and best-effort live catalogue samples; query failures are swallowed and output can remain materially incomplete. `:403–433` pings IndexNow only for eligible existing entities when a key exists, but all network failure is swallowed and no durable queue/lifecycle is visible.

`seo.controller.ts:12–76` exposes public resolve/meta/build/sitemap/llms/robots routes under JwtAuthGuard plus `@Public`; type/slug/id are raw path strings, sitemap/robots/llms have one-hour/24-hour cache headers and resolve returns 404 for no match. `seo.module.ts:18–32` registers six catalogue/article schemas and thin repositories.

## Findings candidates

The read supports: regex injection/expensive fuzzy lookup, public entity projection leakage, incomplete structured data contract, uncapped/escaped sitemap values and caps, robots broad allow rules, hard-coded AI claims, incomplete llms output on failures, and non-durable IndexNow notification/lifecycle.

No product code was changed and no tests/builds were executed during this semantic read.
