# Phase 0B semantic evidence — system-event.schema.ts

**Archive member:** `src/modules/events/system-event.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–30; full 30-line member covered.

Lines 2–3 import Document/uuid. Lines 5–8 describe SystemEvent as an append-only audit/event log intended to receive every domain mutation. Lines 9–10 define a timestamped `system_events` collection and class. Line 11 requires a unique generated id. Lines 12–14 require indexed free-form type, entity_type and entity_id. Lines 15–16 define an optional unique sparse indexed idempotency_key described as a stable command key for exactly-once durable event recording. Lines 17–21 store indexed optional actor_account_id, actor_role, reason_code, patient_account_id and pharmacy_account_id. Lines 22–24 store arbitrary before, after and meta objects. Lines 26–30 create the schema and indexes entity, patient, pharmacy and type event timelines.

**Audit judgment:** This is materially stronger than the legacy audit models: it has explicit collection, unique event id, optional unique idempotency key, actor/entity/account attribution and timeline indexes. However the comments describe append-only/exactly-once intent, not enforcement. There is no immutable write restriction, event type/entity/role/reason allowlist, payload size/redaction/secret policy, actor/session/request/correlation source, event hash/sequence, TTL/retention, or transaction/outbox guarantee coupling domain mutation to event persistence. `before/after/meta:any` can contain PII or secrets and can be abused for unbounded payloads. Sparse unique idempotency semantics need a defined normalization/scope and duplicate-key handling at the writer.

No product code was changed and no tests were executed during this semantic read.
