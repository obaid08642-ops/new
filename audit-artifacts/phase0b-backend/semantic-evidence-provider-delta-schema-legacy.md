# Phase 0B semantic evidence — provider/schemas/delta.schema.ts

**Archive member:** `src/modules/provider/schemas/delta.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–26; full 26-line member covered.

Lines 2–3 import Mongoose Document and UUID. Lines 5–9 define `DeltaStatus` with lowercase pending/approved/rejected values. Lines 11–12 define a timestamped `ProviderDelta` document in `provider_deltas`.

Lines 13–14 define unique UUID `id` and required indexed `provider_account_id`. Lines 16–17 store proposed changes as a required arbitrary `Record<string, any>`. Lines 19–23 store status with enum/default pending, optional rejection reason, reviewer ID and review timestamp. Line 26 creates the schema.

**Critical duplicate-model finding:** This is a second ProviderDelta schema in `src/modules/provider/schemas`, distinct from `src/modules/providers/schemas/provider-delta.schema.ts` previously read. The other model uses `providerId`, `oldData`, `newData`, uppercase status values and a different class/schema shape. Both target the `provider_deltas` collection in the baseline ecosystem. This creates a material mapping/contract ambiguity requiring consumer and model-registration tracing before any remediation or production claim.

**Integrity/security:** `changes` is unrestricted and can carry financial, insurance, radius or other sensitive configuration. The schema has no allowlist, base revision, immutable before snapshot, conflict detection, reviewer role/separation, transition enforcement, rejection-reason requirement or atomic apply marker. Reviewer fields are free strings and do not prove authorization.

**Test implications:** inventory all imports/model registrations/collection consumers; verify exact active schema; test provider ownership, field allowlist, version conflict, reviewer authorization/separation, one-way transitions, required rejection reason, atomic apply, replay/duplicate handling and redaction of sensitive changes. No tests executed during this semantic read.
