# Phase 0B semantic evidence — Legacy usage report and architectural drift

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/legacy/legacy.module.ts:2–97`

`LEGACY_MAP` classifies a small fixed set of pharmacy/order/allocation/broadcast and provider-account collections as legacy duplicates, mapping them to canonical orders/events/provider profiles/users (`legacy.module.ts:13–21`). The map is static and its reasons assert architectural relationships but provide no migration/version/provenance or completeness guarantee.

`LegacyService.report` lists every database collection, uses `estimatedDocumentCount`, classifies only names present in the static map, and returns collection names, counts, canonical names and reasons (`27–49`). Counts can be approximate and collection enumeration is global; no tenant/privacy projection, timeout, pagination or snapshot consistency is visible. `usageMap` is a hard-coded code-path report describing readers/writers and coexistence status for four legacy areas, without runtime verification, last-seen timestamps, migration ownership, deletion gates or drift detection (`52–80`).

The controller is JWT+ADMIN guarded and read-only with report/usage-map endpoints; module has no model registrations or exports beyond provider/controller (`83–97`). The surface is explicitly audit/roadmap-oriented, but it can expose database topology, collection names, counts and internal source paths to admin clients.

No product code was changed and no tests/builds were executed during this semantic read.

## Findings candidates

The read supports: incomplete/static legacy classification, approximate global topology disclosure, hard-coded usage-map drift, absence of retirement controls and missing migration/ownership evidence.
