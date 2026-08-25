# Phase 0B semantic evidence — Article bookmark contract spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/articles/articles.contract.spec.ts:1–41`

The spec builds `ArticleBookmarkContractController` with a mocked database collection and mocked `publishedById` service (`5–10`). It verifies bookmark add resolves true for a published article, calls the publication lookup, and upserts using the caller user ID plus article ID with `$setOnInsert` (`12–22`). It verifies remove deletes only the caller/article pair and returns false as a no-op response path (`24–28`). It verifies a non-public article raises `NotFoundException` before bookmark mutation (`30–35`). It verifies both add and remove have the `REQUIRE_IDEMPOTENCY` reflection metadata (`37–40`).

The spec is controller-instantiated with `conn:any` and mocked `updateOne/deleteOne`, so it does not prove HTTP auth/unauthenticated behavior, input identifier validation, database unique index, duplicate replay/mismatched idempotency response, concurrent upsert/delete behavior, database failure mapping or actual public-article visibility criteria. Remove does not call `publishedById` in this test, so public/deleted article access behavior on removal is unverified. No article SEO/indexing/redirect lifecycle or safe response projection is tested. No code was changed and no build/test/application operation was performed during this read.
