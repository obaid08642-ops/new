# Phase 0B semantic evidence — admin-web-core audit-log.schema.ts

**Archive member:** `src/modules/admin-web-core/schemas/audit-log.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–24; full 24-line member covered.

Lines 2–4 define AuditLogDocument. Lines 6–7 define a timestamped AuditLog class. Lines 8–9 require an ObjectId actorId referencing User. Lines 11–12 require actorRole. Lines 14–15 require endpoint. Lines 17–18 require action. Lines 20–21 require payloadHash. Line 24 creates the schema.

**Comparison:** This is a distinct `AuditLog` model from `src/schemas/audit-log.schema.ts`: the admin-web-core version uses actorId ObjectId, actorRole, endpoint and payloadHash, while the general version uses generated id, optional user_id/role/ip/user_agent/resource_kind/resource_id/details/severity/correlation_id and a createdAt index. They have different collection defaults/model registration locations and non-overlapping field contracts.

**Audit judgment:** Required actor, endpoint, action and payload hash are useful integrity primitives, but actorRole/action/endpoint have no visible runtime allowlists, payloadHash has no algorithm/length/version field, there is no resource ID, tenant/correlation/request ID, event sequence/hash chain, idempotency/deduplication, retention/TTL, redaction or immutable-write enforcement. The schema declares timestamps but no explicit createdAt index. The duplicate model creates ambiguity about which audit record is authoritative and can split queries/retention/security guarantees.

No product code was changed and no tests were executed during this semantic read.
