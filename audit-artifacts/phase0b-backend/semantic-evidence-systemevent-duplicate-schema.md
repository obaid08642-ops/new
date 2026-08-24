# Phase 0B semantic evidence — systemevent.schema.ts

**Archive member:** `src/schemas/systemevent.schema.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read range:** lines 2–31; full 31-line member covered.

Lines 2–4 import Document/Types and define a timestamped SystemEvent class. Lines 6–7 require free-form eventType. Lines 9–10 require indexed free-form type. Lines 12–13 require arbitrary required payload object. Lines 15–16 require source with SYSTEM default. Lines 18–19 default status to pending with a comment describing pending/processed/failed. Lines 21–29 optionally store entity_type, entity_id and actor_account_id. Line 31 creates the schema.

**Comparison:** This is a distinct `SystemEvent` model from `src/modules/events/system-event.schema.ts`. The module event model explicitly targets collection `system_events`, requires unique generated id, requires indexed type/entity_type/entity_id, offers sparse unique idempotency_key, actor role/reason/patient/pharmacy account fields, before/after/meta and timeline indexes. This parallel model instead uses eventType plus type, required payload, source and status, optional entity/actor fields, no explicit collection, no idempotency key, no unique id or indexes beyond type, and no account/role/reason fields.

**Audit judgment:** Required payload/source and processing status may support a basic event queue, but the model has no unique event ID, idempotency/deduplication, event version/sequence, producer correlation, actor/session authenticity, tenant scope, runtime enums, payload bounds/redaction, retention, immutable enforcement or delivery-attempt/dead-letter fields. `eventType` and `type` overlap semantically and can drift. The duplicate model creates ambiguity about the authoritative `SystemEvent` contract and may route records through different collections/consumers with inconsistent exactly-once/audit guarantees.

No product code was changed and no tests were executed during this semantic read.
