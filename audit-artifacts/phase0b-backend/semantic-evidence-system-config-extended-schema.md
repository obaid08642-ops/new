# Phase 0B semantic evidence — system-config-extended.schema.ts

**Archive member:** `src/modules/admin-web-core/schemas/system-config-extended.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–18; full 18-line member covered.

Lines 2–4 define the document type. Lines 6–7 define a timestamped SystemConfigExtended schema. Lines 8–9 require a unique indexed config_key, with examples GLOBAL_SLA_TIMERS and SYSTEM_KILL_SWITCH_ACTIVE. Lines 11–12 require an Object config_value_matrix containing arbitrary key-value sets. Lines 14–15 require a User ObjectId last_modified_by_admin_id. Line 18 creates the schema.

**Audit judgment:** Unique config_key and required modifying-admin reference are positive governance primitives. However the matrix is untyped and has no per-key allowlist, value bounds, secret classification/redaction/encryption, environment/tenant scope, version/CAS, effective time, rollback, two-person approval, idempotency or immutable change history. A last-modified actor is not equivalent to an approval/audit record and can be overwritten by later updates. Kill-switch/SLA examples make the lack of atomic versioned rollout and recovery controls operationally significant. This model is a second system-configuration contract alongside `src/schemas/system-config.schema.ts`, requiring an authoritative ownership/migration decision.

No product code was changed and no tests were executed during this semantic read.
