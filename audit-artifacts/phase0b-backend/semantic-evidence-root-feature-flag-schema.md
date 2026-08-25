# Phase 0B semantic evidence — Root FeatureFlag schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/feature-flag.schema.ts:1–22`

This is a separate schema from `src/modules/feature-flags/feature-flag.schema.ts`, whose evidence is maintained separately. The root schema defines timestamped `feature_flags` records with generated unique ID, required unique/indexed `flagName`, required boolean `isEnabled` defaulting false, and optional `updatedBy` (`7–22`). Unique flag identity, indexed lookup and default-off behavior are explicit controls (`9–16`).

No namespace/environment/tenant/platform/app-version scope is represented, so a globally unique name can conflate contexts (`12–13`). Only a boolean value exists: no typed configuration, rollout percentage/cohort/user/role targeting, geographic/device targeting, schedule/expiry, dependencies or evaluation version are represented (`15–16`). `updatedBy` is optional free-form text, without actor authorization, reason, approval, immutable history, rollback provenance or audit event (`18–19`). No optimistic version/CAS or idempotency control is represented for concurrent updates, and the schema does not establish fail-closed evaluation, cache invalidation or stale-cache behavior. No code was changed and no build/test/application operation was performed during this read.
