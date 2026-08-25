# Phase 0B semantic evidence — ReturnRequest schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/returns.schema.ts:1–22`

`ReturnRequest` is a timestamped Mongoose document with unique generated ID, indexed patient/order/service identifiers, required reason, optional details, refund method defaulting to `wallet`, numeric amount defaulting to zero, attached document strings, enum-like status values (`processing`, `approved`, `completed`, `rejected`), resolver metadata and admin note (`5–20`). The schema factory creates the model (`22`).

The indexed patient/order IDs provide basic lookup support and the status list documents an intended return lifecycle (`7–16`). However, `service_type` and `refund_method` are plain strings despite comments describing allowed values; `amount` is a mutable numeric field with a zero default rather than a server-derived/refund-ledger reference, and no currency, tax, original-line-item or gateway transaction field is present (`10,13–14`). No cross-document validation proves the order/item belongs to the patient or is return-eligible.

`attached_docs` stores opaque strings without content type, private-object reference policy, malware scan, ownership, expiry or retention controls; `reason`, `details` and `admin_note` have no length/content/PII policy (`11–12,15,19`). Status is enum constrained but no transition actor, optimistic version, resolution reason, refund completion, inventory/restock, idempotency, duplicate-per-order or compound ownership uniqueness is visible (`16–18`). No soft-delete/TTL/audit integrity or payment/insurance authorization boundary appears. No code was changed and no build/test/application operation was performed during this read.
