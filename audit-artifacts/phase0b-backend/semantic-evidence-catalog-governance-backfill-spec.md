# Phase 0B semantic evidence — Catalog governance backfill spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/contracts/catalog-governance-backfill.contract.spec.ts:1–52`

This Jest contract spec imports the backfill policy/filter/apply/rollback functions and selects medicine, provider and facility policies (`1–6`). It verifies that public eligibility for legacy medicines requires verified/non-deleted records with missing governance fields (`8–15`), provider inheritance requires active status plus license verification (`17–22`), operational-only facilities receive no inherited-public filter (`24–26`), backfill writes inherited approval first and fail-closed pending rows second without overwriting explicit governance, and rollback targets only records bearing migration provenance (`28–51`).

These tests provide meaningful policy evidence: facilities are not automatically public merely because they are operational, medicine/provider inheritance has explicit predicates, pending rows are hidden, and provenance scopes rollback. The collection is a mocked `updateMany` with fixed counts, so no real database, batch size, transaction, write concern, index, timeout or production data behavior is proven (`28–51`).

The spec does not cover all policy types/fields, explicit governance combinations, malformed legacy values, duplicate/ambiguous records, provider license expiry/revocation, medicine recall/withdrawal, facility approval, dry-run/report mode, partial update failure, retry/replay, concurrent migration, rollback failure, audit actor, snapshot/backup or post-migration public API/SEO cache invalidation (`8–51`). Assertions use `any`/`expect.objectContaining`, so unintended update fields could escape detection. No test was run and no product code was changed during this semantic read.
