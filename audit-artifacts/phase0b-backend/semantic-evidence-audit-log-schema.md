# Phase 0B semantic evidence — audit-log.schema.ts

**Archive member:** `src/schemas/audit-log.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–20; full 20-line member covered.

Lines 2–5 import Document/uuid and define a timestamped AuditLog schema. Line 7 provides a generated unique id. Line 8 requires indexed free-form action. Lines 9–14 store optional user_id, role, ip, user_agent, resource_kind and resource_id. Line 15 stores arbitrary details as an Object. Line 16 defaults severity to info but expresses a TypeScript union without a Mongoose enum validator. Line 17 stores optional correlation_id. Lines 19–20 create the schema and add a createdAt descending index.

**Audit judgment:** Unique event id, indexed action and createdAt, actor/resource references and correlation_id are useful audit primitives. However action/role/resource_kind/severity are not schema-enforced allowlists, details is arbitrary and may contain secrets/PII, IP/user-agent have no minimization or retention policy, and there is no immutable-write mechanism, append-only sequence/hash chain, event idempotency/deduplication key, actor-session/source/request reference or tenant scope. The TypeScript severity union does not prevent invalid runtime values because no enum validator is visible.

No product code was changed and no tests were executed during this semantic read.
