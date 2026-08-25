# Phase 0B semantic evidence — Deprecated insurance seed script

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `scripts/seed-insurance-companies.ts:1–15`

The file explicitly declares itself deprecated and warns against seeding a second insurance catalog (`1–3`). It identifies `assets/insurance-logos/manifest.json` as the only candidate source and `scripts/reconcile-insurance-catalog.ts` as the supported entry point, with dry-run-first/non-destructive claims (`4–10`). The module then throws immediately at top level with a deprecation message (`12–14`). No database, storage or catalog mutation occurs in this file, which is safer than the earlier legacy seed implementation.

However, the deprecated executable remains present under a plausible seed-script path and can still be discovered/invoked by operators, package scripts, deployment automation or tooling that enumerates `scripts/*.ts`. Its failure is a generic runtime throw rather than a typed CLI exit/help contract, and the file does not contain a machine-readable deprecation marker, migration ID, removal date, owner or CI guard proving no automation references it (`12–14`). The comments assert properties of the replacement script but do not bind to its actual implementation or verify that the replacement is the only reachable entry point (`4–10`). No product code was changed and the deprecated script was not executed; no tests/builds were run during this semantic read.
