# Phase 0B semantic evidence — Feature flag schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/feature-flags/feature-flag.schema.ts:1–14`

`FeatureFlag` contains only a required unique `key` and boolean `enabled` defaulting false (`feature-flag.schema.ts:4–10`). It has no owner/environment/scope, target cohort, percentage rollout, effective start/end, version/ETag, reason, actor, approval, change history, rollback, dependency, kill-switch safety class or provenance fields. Generic timestamps are not enabled. A single boolean cannot distinguish unavailable, blocked pending contract, degraded, emergency-disabled and intentionally enabled states. Any consumer that reads the flag without additional policy can therefore open an unapproved feature or lose the auditability needed for production gating. No product code was changed and no tests/builds were executed during this semantic read.
