# Phase 0B semantic evidence — Drug rejection log schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/drug-rejection-log.schema.ts:1–22`

The schema defines timestamped `pharmacy_drug_rejection_logs` documents with generated ID, indexed medicine/order/pharmacy IDs, required runtime enum `type: reject|accept` with index, a `timestamp` defaulting to `Date.now`, and a compound `{ medicine_id: 1, type: 1, timestamp: -1 }` index (`5–22`). The type enum and indexes provide basic classification and lookup controls (`9–16,22`).

The model has no actor identity/role, reason, source, prescription/line-item identity, quantity, clinical context, approval or consent linkage. IDs have no visible cross-document ownership/tenant integrity, and the same order/medicine/pharmacy event can be duplicated because no idempotency/event key or uniqueness is represented (`9–16`). The collection is not explicitly append-only: no update/delete guard, immutable audit metadata, correlation/request ID, previous/new state or provenance is represented. `timestamp` default does not establish server-authoritative event time or ordering. No retention/TTL/legal hold/DSAR policy, PII/PHI minimization, redaction, or query access boundary is represented. No code was changed and no build/test/application operation was performed during this read.
