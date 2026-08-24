# Phase 0B semantic evidence — medicines.controller.ts

**Archive member:** `src/modules/medicines/medicines.controller.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read coverage:** lines 1–362; full controller file covered.

## Guard and public surface

The class is globally decorated with JwtAuthGuard (6–8), while many catalog reads and suggestion routes are marked `@Public`. Public reads include list/pagination/cursor (11–32), autocomplete (44–48), barcode lookup by body and path (50–60), categories/filters/compare (62–78), hot/did-you-mean/trending (83–102), public medicine id/details/alternatives (273–292), and the static locale/category fragment controller (351–361). Recent-search and recently-viewed use the authenticated CurrentUser (104–108, 267–271).

`optionalUserId` decodes a Bearer JWT payload without verifying its signature (34–42). It is explicitly used only for analytics attribution in public list/details calls, not as a security gate, but accepting unverified claims in analytics can contaminate attribution data.

## Mutation/admin surface

Provider/patient shortage reporting, image suggestions and catalog change suggestions are exposed as POST routes (117–121, 158–164, 187–199); image/change suggestions are public and fall back to a synthetic guest identity. Admin list/approve/reject/clear/set/catalog/report/import operations are role-decorated (110–156, 166–185, 201–265, 299–347). Manual entry is authenticated but has no explicit role decorator (294–297), relying on global/controller guard policy.

Several mutation bodies are anonymous inline objects or `any`: barcode lookup (51–53), compare (75–78), manual entry (294–297), admin change approval (211–212), admin update (223–227), admin create (247–250), imports (336–347), and change/image suggestion bodies (162–198). No `Idempotency-Key` parameter or explicit replay contract is visible on these mutations.

## Duplicate and route-order observations

`@Post('admin/catalog')` is declared twice: `adminCreate` at lines 246–250 calls `adminCreateCatalog`, and `createCatalog` at lines 305–308 calls `createCatalog`. Both have the same HTTP method/path and ADMIN role. Nest route registration order can make one unreachable or behavior-dependent; the two service methods also have different governance defaults and payload semantics.

The wildcard `@Get(':id')` is declared after fixed admin/read paths, which reduces the usual static-route capture risk. Public detail uses `getPublicById`, correctly applying service governance; authenticated/admin `manual-entry` and admin mutation paths remain dependent on global role/DTO/replay policy.

## SEO/static fragment

`PublicCatalogController` exposes `GET /public/catalog/:locale/:category.json` and delegates locale/category validation and governed projection to the service. The controller itself does not add cache headers, canonical metadata or content negotiation; those remain outside this controller contract.

No product code was changed and no tests were executed during this semantic read.
