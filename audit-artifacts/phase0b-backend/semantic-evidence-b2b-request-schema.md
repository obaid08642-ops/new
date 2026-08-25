# Phase 0B semantic evidence — B2B request schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/b2b-request.schema.ts:1–18`

`B2BRequest` is a timestamped `b2b_requests` collection with generated unique ID, required indexed pharmacy string, required total item count, input-method union (`voice|ocr|manual`) defaulting to manual, status union (`pending|approved|rejected`) defaulting to pending and indexed, notes, array-typed items with name/qty/unit shape and submitted date (`5–14`). The schema exports a document type and factory (`17–18`).

The TypeScript unions communicate intended values, but the Mongoose decorators for `input_method` and `status` do not visibly declare runtime enum constraints (`10–11`). `pharmacy`, notes, item names/units and numeric quantities/counts lack length, range, normalization, identity or content validation (`8–13`). The item array is declared as generic `Array` rather than a nested typed schema, and `total_items` is mutable and not visibly derived from the items array (`9,13`).

No pharmacy account/tenant/actor relationship, requester authorization, deduplication key, workflow actor/reason, approval audit, OCR/voice provenance, raw-document retention policy, PII/PHI minimization, attachment reference, server-authoritative pricing, inventory reservation, payment, idempotency or optimistic concurrency field is visible (`7–14`). Status has no transition graph, rejection reason, expiry/timeout or approval identity. No indexes for operational queues or compound ownership are shown beyond pharmacy/status (`7–11`). No code was changed and no build/test/application operation was performed during this read.
